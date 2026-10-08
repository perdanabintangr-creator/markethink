import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { randomToken } from "@/lib/utils";

/** POST = aktifkan link publik, DELETE = matikan. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const { data: chat } = await s.supabase.from("chats").select("share_token").eq("id", id).maybeSingle();
  if (!chat) return jsonError(404, "not_found");
  const token = chat.share_token ?? randomToken();
  await s.supabase.from("chats").update({ share_token: token }).eq("id", id);
  return NextResponse.json({ token });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  await s.supabase.from("chats").update({ share_token: null }).eq("id", id);
  return NextResponse.json({ ok: true });
}
