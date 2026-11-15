import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { OUTCOME_RESULTS } from "@/lib/ai/outcomes";

/** Ingatan Hasil: laporan hasil strategi per jawaban AI (GET daftar per chat, POST simpan, DELETE hapus). */
export async function GET(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const chatId = new URL(req.url).searchParams.get("chatId") ?? "";
  if (!z.string().uuid().safeParse(chatId).success) return jsonError(400, "invalid_chat");
  const { data } = await s.supabase
    .from("strategy_outcomes")
    .select("message_id, result, note")
    .eq("chat_id", chatId);
  return NextResponse.json({ outcomes: data ?? [] });
}

const postSchema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().min(1).max(100),
  result: z.enum(OUTCOME_RESULTS),
  topic: z.string().trim().min(1).max(240),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { chatId, messageId, result, topic, note } = parsed.data;
  // Lingkup project mengikuti chat (RLS: hanya chat milik user yang terbaca).
  const { data: chat } = await s.supabase.from("chats").select("workspace_id").eq("id", chatId).maybeSingle();
  if (!chat) return jsonError(404, "chat_not_found");
  const { error } = await s.supabase.from("strategy_outcomes").upsert(
    {
      user_id: s.user.id,
      chat_id: chatId,
      message_id: messageId,
      workspace_id: chat.workspace_id ?? null,
      result,
      topic,
      note: note || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,chat_id,message_id" },
  );
  if (error) return jsonError(400, "save_failed");
  return NextResponse.json({ ok: true });
}

const delSchema = z.union([
  z.object({ id: z.string().uuid() }),
  z.object({ chatId: z.string().uuid(), messageId: z.string().min(1).max(100) }),
]);

export async function DELETE(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = delSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const q = s.supabase.from("strategy_outcomes").delete().eq("user_id", s.user.id);
  const { error } = "id" in parsed.data
    ? await q.eq("id", parsed.data.id)
    : await q.eq("chat_id", parsed.data.chatId).eq("message_id", parsed.data.messageId);
  if (error) return jsonError(400, "delete_failed");
  return NextResponse.json({ ok: true });
}
