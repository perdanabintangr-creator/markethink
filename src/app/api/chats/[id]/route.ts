import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  workspace_id: z.string().uuid().nullable().optional(),
});

/** Status & pesan terbaru — dipakai saat chat dibuka ketika AI masih menjawab (jawaban muncul otomatis begitu selesai). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const [{ data: chat }, { data: rows }] = await Promise.all([
    s.supabase.from("chats").select("generating_at").eq("id", id).maybeSingle(),
    s.supabase.from("messages").select("id, role, parts, metadata").eq("chat_id", id).order("position"),
  ]);
  if (!chat) return jsonError(404, "not_found");
  return NextResponse.json({
    generating_at: chat.generating_at,
    messages: (rows ?? []).map((r) => ({ id: r.id, role: r.role, parts: r.parts, metadata: r.metadata ?? undefined })),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  // Chat boleh dipindah bebas: masuk project, pindah project, atau dikeluarkan (permintaan founder 2026-10-13).
  // Pesan lama tetap utuh; chat memakai konteks (brand kit/dokumen/memory) project barunya mulai pesan berikutnya.
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
