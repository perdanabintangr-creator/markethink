import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, sanitizeFileName } from "@/lib/files";

const schema = z.object({
  name: z.string().min(1).max(200),
  size: z.number().int().positive(),
  scope: z.enum(["chat", "workspace"]),
  workspaceId: z.string().uuid().optional(),
});

/**
 * Langkah 1 upload: beri URL upload langsung ke Storage (melewati batas 4,5 MB body Vercel).
 * Validasi isi file (magic bytes) dilakukan di langkah 2 setelah file tersimpan.
 */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!(await checkRateLimit("user", `upload:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { size, scope, workspaceId } = parsed.data;
  if (size > MAX_UPLOAD_BYTES) return jsonError(413, "file_too_large", { maxMb: MAX_UPLOAD_BYTES / 1024 / 1024 });
  const name = sanitizeFileName(parsed.data.name);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return jsonError(415, "unsupported_type");

  let path: string;
  if (scope === "workspace") {
    if (!workspaceId) return jsonError(400, "workspace_required");
    const { data: ws } = await s.supabase.from("workspaces").select("id").eq("id", workspaceId).maybeSingle();
    if (!ws) return jsonError(404, "workspace_not_found");
    path = `${s.user.id}/workspaces/${workspaceId}/${crypto.randomUUID()}-${name}`;
  } else {
    path = `${s.user.id}/chat/${crypto.randomUUID()}-${name}`;
  }
  const { data, error } = await createAdminClient().storage.from("uploads").createSignedUploadUrl(path);
  if (error || !data) return jsonError(500, "sign_failed");
  return NextResponse.json({ path, token: data.token, name });
}
