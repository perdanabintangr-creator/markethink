import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

/** Buka/unduh file milik user (gambar & PPT hasil AI, lampiran) lewat signed URL berumur pendek. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "invalid_id");

  // RLS: hanya lampiran milik user sendiri yang terbaca.
  const { data: row } = await s.supabase.from("attachments").select("name, storage_path").eq("id", id).maybeSingle();
  if (!row) return jsonError(404, "not_found");

  const download = new URL(req.url).searchParams.has("download");
  const { data, error } = await createAdminClient()
    .storage.from("uploads")
    .createSignedUrl(row.storage_path, 300, download ? { download: row.name } : undefined);
  if (error || !data) return jsonError(500, "sign_failed");
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, max-age=240" } });
}
