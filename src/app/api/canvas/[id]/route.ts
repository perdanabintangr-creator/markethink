import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const { data: canvas } = await s.supabase
    .from("canvases")
    .select("id, title, chat_id, current_version, share_token, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!canvas) return jsonError(404, "not_found");
  const { data: versions } = await s.supabase
    .from("canvas_versions")
    .select("version, content, created_at")
    .eq("canvas_id", id)
    .order("version", { ascending: false })
    .limit(50);
  return NextResponse.json({ canvas, versions: versions ?? [] });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const parsed = z.object({ title: z.string().trim().min(1).max(160) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  await s.supabase.from("canvases").update({ title: parsed.data.title }).eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  await s.supabase.from("canvases").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
