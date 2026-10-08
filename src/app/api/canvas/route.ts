import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { truncate } from "@/lib/utils";

const schema = z.object({
  chatId: z.string().uuid().nullish(),
  title: z.string().max(160).optional(),
  content: z.string().min(1).max(200_000),
});

function titleFrom(content: string) {
  const heading = content.match(/^#{1,3}\s+(.+)$/m)?.[1];
  return truncate((heading ?? content.split("\n").find((l) => l.trim()) ?? "Dokumen").replace(/[*_`#]/g, ""), 80);
}

export async function GET(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const chatId = new URL(req.url).searchParams.get("chatId");
  let q = s.supabase.from("canvases").select("id, title, chat_id, current_version, share_token, updated_at").order("updated_at", { ascending: false }).limit(100);
  if (chatId) q = q.eq("chat_id", chatId);
  const { data } = await q;
  return NextResponse.json({ canvases: data ?? [] });
}

export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { chatId, content } = parsed.data;
  const title = parsed.data.title?.trim() || titleFrom(content);
  const { data: canvas, error } = await s.supabase
    .from("canvases")
    .insert({ user_id: s.user.id, chat_id: chatId ?? null, title, current_version: 1 })
    .select("id")
    .single();
  if (error || !canvas) return jsonError(400, "create_failed");
  await s.supabase.from("canvas_versions").insert({ canvas_id: canvas.id, user_id: s.user.id, version: 1, content });
  return NextResponse.json({ id: canvas.id, title });
}
