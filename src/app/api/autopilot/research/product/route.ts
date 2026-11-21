import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { autopilotAllowance } from "@/lib/autopilot/quota";

const schema = z.object({ researchId: z.string().uuid(), index: z.number().int().min(0).max(20), name: z.string().trim().min(1).max(120) });

/** Simpan gambar temuan riset sebagai produk katalog (pelanggan menyatakan foto itu milik brand-nya). */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!autopilotAllowance(s.profile.plan_id, s.profile.role)) return jsonError(403, "plan");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { data: r } = await s.supabase.from("brand_research").select("workspace_id, images").eq("id", parsed.data.researchId).maybeSingle();
  const path = (r?.images as { path?: string | null }[] | undefined)?.[parsed.data.index]?.path;
  if (!r || !path || !path.startsWith(`${s.user.id}/`) || path.includes("..")) return jsonError(404, "not_found");
  const { data, error } = await createAdminClient()
    .from("brand_products")
    .insert({ user_id: s.user.id, workspace_id: r.workspace_id, name: parsed.data.name, photo_paths: [path] })
    .select("id, name")
    .single();
  if (error) return jsonError(500, "save_failed");
  return NextResponse.json({ product: data });
}
