import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

/** Ganti nama / sembunyikan hasil Tools Pro dari riwayat (tidak dihapus — tetap dihitung kuota). */
async function ownRun(id: string) {
  const s = await apiSession();
  if (s.error) return { error: s.error } as const;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: jsonError(400, "invalid_id") } as const;
  const { data } = await s.supabase.from("tool_runs").select("id").eq("id", id).maybeSingle();
  if (!data) return { error: jsonError(404, "not_found") } as const;
  return { error: null } as const;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownRun(id);
  if (own.error) return own.error;
  const parsed = z.object({ title: z.string().trim().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  await createAdminClient().from("tool_runs").update({ title: parsed.data.title }).eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownRun(id);
  if (own.error) return own.error;
  await createAdminClient().from("tool_runs").update({ hidden: true }).eq("id", id);
  return NextResponse.json({ ok: true });
}
