import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_REVISIONS } from "@/lib/addons/format";

/** Ganti nama / sembunyikan hasil Tools Pro dari riwayat (tidak dihapus — tetap dihitung kuota). */
async function ownRun(id: string) {
  const s = await apiSession();
  if (s.error) return { error: s.error } as const;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: jsonError(400, "invalid_id") } as const;
  const { data } = await s.supabase.from("tool_runs").select("id").eq("id", id).maybeSingle();
  if (!data) return { error: jsonError(404, "not_found") } as const;
  return { error: null } as const;
}

/** Versi terbaru dari rantai hasil (hasil asal + revisinya) — untuk panel hasil di chat. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "invalid_id");
  const { data: runs } = await s.supabase
    .from("tool_runs")
    .select("id, tool, title, status, input, output, files, created_at, revision_of")
    .or(`id.eq.${id},revision_of.eq.${id}`)
    .order("created_at", { ascending: true });
  const done = (runs ?? []).filter((r) => r.status === "ok");
  const latest = done[done.length - 1];
  if (!latest) return jsonError(404, "not_found");
  const revisions = done.filter((r) => r.revision_of).length;
  return NextResponse.json({ run: latest, version: done.length, revisionsLeft: Math.max(0, MAX_REVISIONS - revisions) });
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
