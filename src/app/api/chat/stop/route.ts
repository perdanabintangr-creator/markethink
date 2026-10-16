import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";

const body = z.object({ id: z.string().uuid() });

/** Tombol Stop: hentikan jawaban AI yang sedang dibuat di server untuk chat ini (milik user sendiri — RLS). */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const now = new Date().toISOString();
  await s.supabase.from("chats").update({ stop_requested_at: now, generating_at: null }).eq("id", parsed.data.id);
  return NextResponse.json({ ok: true });
}
