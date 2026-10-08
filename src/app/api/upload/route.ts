import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractText, isScannedPdf, readStoredUpload, sanitizeFileName } from "@/lib/files";

export const maxDuration = 60;

const schema = z.object({ path: z.string().min(1).max(400), name: z.string().min(1).max(200) });

/** Langkah 2 upload lampiran chat: validasi isi file di Storage, ekstrak teks sekali, simpan. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { path } = parsed.data;
  if (!path.startsWith(`${s.user.id}/chat/`) || path.includes("..")) return jsonError(403, "forbidden");
  const name = sanitizeFileName(parsed.data.name);

  const admin = createAdminClient();
  const bucket = admin.storage.from("uploads");
  const file = await readStoredUpload(async () => (await bucket.download(path)).data, name);
  if ("error" in file) {
    await bucket.remove([path]);
    return jsonError(file.error === "not_found" ? 404 : file.error === "file_too_large" ? 413 : 415, file.error);
  }

  let extracted: string | null = null;
  if (!file.mime.startsWith("image/")) {
    try {
      extracted = await extractText(file.mime, file.bytes);
    } catch (err) {
      console.error("[upload] ekstraksi gagal", err);
      if (file.mime !== "application/pdf") return jsonError(422, "extract_failed");
    }
  }

  const id = crypto.randomUUID();
  const { error } = await s.supabase.from("attachments").insert({
    id,
    user_id: s.user.id,
    name,
    mime: file.mime,
    size: file.bytes.byteLength,
    storage_path: path,
    extracted_text: extracted,
  });
  if (error) return jsonError(500, "save_failed");
  return NextResponse.json({
    id,
    name,
    mime: file.mime,
    size: file.bytes.byteLength,
    scanned: isScannedPdf(file.mime, extracted),
  });
}
