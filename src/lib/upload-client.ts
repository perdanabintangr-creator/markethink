"use client";

import { createClient } from "@/lib/supabase/client";

export const UPLOAD_ERRORS: Record<string, string> = {
  file_too_large: "File terlalu besar (maks 25 MB).",
  unsupported_type: "Format belum didukung. Gunakan PDF, Word, Excel, PowerPoint, CSV, TXT, JSON, atau gambar.",
  extract_failed: "Isi file tidak bisa dibaca.",
  rate_limited: "Terlalu banyak upload, tunggu sebentar.",
  quota_exceeded: "Kredit hari ini habis.",
  storage_failed: "Gagal menyimpan file. Coba lagi.",
};

/**
 * Upload 3 langkah: minta URL → kirim file langsung ke Storage → server memvalidasi & membaca isinya.
 * Mengembalikan JSON dari langkah terakhir, atau { error }.
 */
export async function uploadFile<T>(
  file: File,
  opts: { scope: "chat" } | { scope: "workspace"; workspaceId: string },
): Promise<T | { error: string; message?: string }> {
  const sign = await fetch("/api/upload/sign", {
    method: "POST",
    body: JSON.stringify({ name: file.name, size: file.size, ...opts }),
  });
  const signed = await sign.json().catch(() => ({}));
  if (!sign.ok) return { error: signed.error ?? "storage_failed" };

  const { error } = await createClient()
    .storage.from("uploads")
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type || undefined });
  if (error) return { error: "storage_failed" };

  const url = opts.scope === "chat" ? "/api/upload" : `/api/workspaces/${opts.workspaceId}/files`;
  const done = await fetch(url, { method: "POST", body: JSON.stringify({ path: signed.path, name: signed.name }) });
  const data = await done.json().catch(() => ({}));
  if (!done.ok) return { error: data.error ?? "storage_failed", message: data.message };
  return data as T;
}
