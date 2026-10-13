import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";

const schema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

/** Simpan urutan project hasil drag & drop di sidebar. RLS memastikan hanya project milik user yang berubah. */
export async function PATCH(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const results = await Promise.all(
    parsed.data.ids.map((id, i) => s.supabase.from("workspaces").update({ sort_order: i }).eq("id", id)),
  );
  if (results.some((r) => r.error)) return jsonError(400, "update_failed");
  return NextResponse.json({ ok: true });
}
