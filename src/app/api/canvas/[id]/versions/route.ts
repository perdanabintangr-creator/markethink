import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";

/** Simpan versi baru canvas. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const parsed = z.object({ content: z.string().min(1).max(200_000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { data: canvas } = await s.supabase.from("canvases").select("current_version").eq("id", id).maybeSingle();
  if (!canvas) return jsonError(404, "not_found");
  const version = (canvas.current_version as number) + 1;
  const { error } = await s.supabase
    .from("canvas_versions")
    .insert({ canvas_id: id, user_id: s.user.id, version, content: parsed.data.content });
  if (error) return jsonError(409, "version_conflict");
  await s.supabase.from("canvases").update({ current_version: version, updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ version });
}
