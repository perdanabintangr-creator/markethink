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
  // Chat yang sudah berisi percakapan terkunci di project-nya (agar isi tidak bocor ke project lain).
  if (parsed.data.workspace_id !== undefined) {
    const { count } = await s.supabase.from("messages").select("id", { count: "exact", head: true }).eq("chat_id", id);
    if (count) return jsonError(409, "chat_locked_to_project");
  }
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
