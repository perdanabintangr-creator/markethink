import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  workspace_id: z.string().uuid().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { error } = await s.supabase.from("chats").update(parsed.data).eq("id", id);
  if (error) return jsonError(400, "update_failed");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  await s.supabase.from("chats").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
