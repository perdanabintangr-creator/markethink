"use client";

import { createClient } from "@/lib/supabase/client";

export const UPLOAD_ERRORS: Record<string, string> = {
  file_too_large: "File terlalu besar (maks 25 MB).",
  unsupported_type: "Format belum didukung. Gunakan PDF, Word, Excel, PowerPoint, CSV, TXT, JSON, atau gambar.",
  extract_failed: "Isi file tidak bisa dibaca.",
  rate_limited: "Terlalu banyak upload, tunggu sebentar.",
  quota_exceeded: "Kredit hari ini habis.",
  storage_failed: "Gagal menyimpan file. Coba lagi.",
  storage_full: "Penyimpanan kamu penuh. Hapus file lama atau upgrade paket.",
};

/**
 * Upload 3 langkah: minta URL → kirim file langsung ke Storage → server memvalidasi & membaca isinya.
 * Mengembalikan JSON dari langkah terakhir, atau { error }.
 */
/**
 * Kompres foto besar di browser sebelum upload (hemat penyimpanan & kuota user): sisi terpanjang maks 2048 px,
 * WebP kualitas 85% (fallback JPEG). Hasil hanya dipakai bila memang lebih kecil. GIF & file non-gambar tidak diubah.
 */
export async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1024 * 1024 || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.85));
    let blob = await toBlob("image/webp");
    let ext = "webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob("image/jpeg");
      ext = "jpg";
    }
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}

export async function uploadFile<T>(
  original: File,
  opts: { scope: "chat" } | { scope: "workspace"; workspaceId: string },
): Promise<T | { error: string; message?: string }> {
  const file = await compressImage(original);
  const sign = await fetch("/api/upload/sign", {
    method: "POST",
    body: JSON.stringify({ name: file.name, size: file.size, ...opts }),
  });
  const signed = await sign.json().catch(() => ({}));
  if (!sign.ok) return { error: signed.error ?? "storage_failed", message: signed.message };

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
