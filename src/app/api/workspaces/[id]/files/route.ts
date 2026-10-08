import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { consumeCredits } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectMime, extractText, MAX_UPLOAD_BYTES, sanitizeFileName } from "@/lib/files";
import { chunkText } from "@/lib/ai/chunk";
import { embedDocuments, embeddingsEnabled } from "@/lib/ai/embeddings";
import { EXTRA_CREDIT_COST } from "@/lib/ai/models.config";

export const maxDuration = 60;

/** Upload file knowledge ke workspace → ekstrak → chunk → embed (pgvector). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id: workspaceId } = await params;
  if (!(await checkRateLimit("user", `upload:${s.user.id}`)).ok) return jsonError(429, "rate_limited");

  const { data: ws } = await s.supabase.from("workspaces").select("id").eq("id", workspaceId).maybeSingle();
  if (!ws) return jsonError(404, "workspace_not_found");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "no_file");
  if (file.size > MAX_UPLOAD_BYTES) return jsonError(413, "file_too_large");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = sanitizeFileName(file.name);
  const mime = detectMime(name, file.type, bytes);
  if (!mime || mime.startsWith("image/")) return jsonError(415, "unsupported_type");

  const credit = await consumeCredits(s.user.id, EXTRA_CREDIT_COST.attachment, "knowledge_upload", { workspaceId });
  if (!credit.ok) return jsonError(402, "quota_exceeded");

  const admin = createAdminClient();
  const fileId = crypto.randomUUID();
  const path = `${s.user.id}/workspaces/${workspaceId}/${fileId}-${name}`;
  const { error: upErr } = await admin.storage.from("uploads").upload(path, bytes, { contentType: mime });
  if (upErr) return jsonError(500, "storage_failed");
  await s.supabase.from("workspace_files").insert({
    id: fileId,
    workspace_id: workspaceId,
    user_id: s.user.id,
    name,
    mime,
    size: file.size,
    storage_path: path,
    status: "processing",
  });

  try {
    const text = await extractText(mime, bytes);
    const chunks = chunkText(text).slice(0, 200);
    if (!chunks.length) throw new Error("Tidak ada teks yang bisa dibaca dari file ini.");
    const embeddings = embeddingsEnabled() ? await embedDocuments(chunks) : [];
    const rows = chunks.map((content, i) => ({
      file_id: fileId,
      workspace_id: workspaceId,
      user_id: s.user.id,
      chunk_index: i,
      content,
      embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
    }));
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await s.supabase.from("document_chunks").insert(rows.slice(i, i + 50));
      if (error) throw error;
    }
    await s.supabase.from("workspace_files").update({ status: "ready", chunk_count: chunks.length }).eq("id", fileId);
    return NextResponse.json({ id: fileId, name, status: "ready", chunks: chunks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memproses file";
    await s.supabase.from("workspace_files").update({ status: "error", error: message.slice(0, 300) }).eq("id", fileId);
    return jsonError(422, "process_failed", { message });
  }
}
