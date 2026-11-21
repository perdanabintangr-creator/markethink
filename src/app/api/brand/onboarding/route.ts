import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { mergeOnboarding, onboardingFields } from "@/lib/brand/onboarding";
import { loadOnboarding } from "@/lib/brand/server";

const body = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(80).optional(),
  fields: onboardingFields,
});

/** Status onboarding satu brand (kelengkapan, aset, versi Brand DNA). */
export async function GET(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const ws = new URL(req.url).searchParams.get("ws") ?? "";
  if (!z.string().uuid().safeParse(ws).success) return jsonError(400, "invalid_ws");
  const o = await loadOnboarding(createAdminClient(), s.user.id, ws);
  if (!o) return jsonError(404, "workspace_not_found");
  return NextResponse.json({
    completeness: o.completeness,
    status: o.ws.onboarding_status,
    approvedVersion: o.approvedVersion,
    assets: o.assets.map((a) => ({ id: a.id, kind: a.kind })),
  });
}

/** Simpan isian onboarding (draf) ke Brand Kit project. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("light", `brand-onboarding:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const admin = createAdminClient();
  const { data: ws } = await s.supabase.from("workspaces").select("id, name, brand_kit, onboarding_status").eq("id", parsed.data.workspaceId).maybeSingle();
  if (!ws) return jsonError(404, "workspace_not_found");
  const kit = mergeOnboarding((ws.brand_kit ?? {}) as Record<string, unknown>, parsed.data.fields);
  const { error } = await admin
    .from("workspaces")
    .update({
      brand_kit: kit,
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ws.id)
    .eq("user_id", s.user.id);
  if (error) return jsonError(500, "save_failed");
  const o = await loadOnboarding(admin, s.user.id, ws.id as string);
  return NextResponse.json({ ok: true, completeness: o?.completeness ?? null });
}
