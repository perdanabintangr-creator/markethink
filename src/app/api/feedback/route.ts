import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";

const schema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().min(1).max(100),
  rating: z.union([z.literal(1), z.literal(-1)]),
  reason: z.string().max(100).optional(),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { chatId, messageId, rating, reason, comment } = parsed.data;
  const { error } = await s.supabase.from("message_feedback").upsert(
    { chat_id: chatId, message_id: messageId, user_id: s.user.id, rating, reason: reason ?? null, comment: comment ?? null },
    { onConflict: "chat_id,message_id,user_id" },
  );
  if (error) return jsonError(400, "save_failed");
  return NextResponse.json({ ok: true });
}
