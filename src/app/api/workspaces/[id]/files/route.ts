import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { consumeCredits } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractText, readStoredUpload, sanitizeFileName } from "@/lib/files";
import { z } from "zod";
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

  const body = z
    .object({ path: z.string().min(1).max(400), name: z.string().min(1).max(200) })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(400, "invalid_body");
  const path = body.data.path;
  if (!path.startsWith(`${s.user.id}/workspaces/${workspaceId}/`) || path.includes("..")) return jsonError(403, "forbidden");
  const name = sanitizeFileName(body.data.name);
  const bucket = createAdminClient().storage.from("uploads");
  const file = await readStoredUpload(async () => (await bucket.download(path)).data, name);
  if ("error" in file || file.mime.startsWith("image/")) {
    await bucket.remove([path]);
    return jsonError(415, "error" in file ? file.error : "unsupported_type");
  }
  const { bytes, mime } = file;

  const credit = await consumeCredits(s.user.id, EXTRA_CREDIT_COST.attachment, "knowledge_upload", { workspaceId });
  if (!credit.ok) return jsonError(402, "quota_exceeded");

  const fileId = crypto.randomUUID();
  await s.supabase.from("workspace_files").insert({
    id: fileId,
    workspace_id: workspaceId,
    user_id: s.user.id,
    name,
    mime,
    size: bytes.byteLength,
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
