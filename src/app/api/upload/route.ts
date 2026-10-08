import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectMime, extractText, MAX_UPLOAD_BYTES, sanitizeFileName } from "@/lib/files";

export const maxDuration = 60;

/** Upload lampiran chat (gambar/dokumen). Teks diekstrak sekali dan disimpan. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!(await checkRateLimit("user", `upload:${s.user.id}`)).ok) return jsonError(429, "rate_limited");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "no_file");
  if (file.size > MAX_UPLOAD_BYTES) return jsonError(413, "file_too_large", { maxMb: MAX_UPLOAD_BYTES / 1024 / 1024 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = sanitizeFileName(file.name);
  const mime = detectMime(name, file.type, bytes);
  if (!mime) return jsonError(415, "unsupported_type");

  let extracted: string | null = null;
  if (!mime.startsWith("image/")) {
    try {
      extracted = await extractText(mime, bytes);
    } catch (err) {
      console.error("[upload] ekstraksi gagal", err);
      return jsonError(422, "extract_failed");
    }
  }

  const id = crypto.randomUUID();
  const path = `${s.user.id}/chat/${id}-${name}`;
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage.from("uploads").upload(path, bytes, { contentType: mime });
  if (upErr) return jsonError(500, "storage_failed");

  const { error } = await s.supabase.from("attachments").insert({
    id,
    user_id: s.user.id,
    name,
    mime,
    size: file.size,
    storage_path: path,
    extracted_text: extracted,
  });
  if (error) return jsonError(500, "save_failed");
  return NextResponse.json({ id, name, mime, size: file.size });
}
