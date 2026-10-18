import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { guardRequest } from "@/lib/ratelimit";
import { importAttachmentToCanva } from "@/lib/connectors/canva";
import { connectUrlFor } from "@/lib/connectors/apps";
import { safeReturnPath } from "@/lib/connectors/oauth";
import { connectorsText } from "@/lib/i18n/connectors";

// Import Canva = job asinkron (polling sampai ±60 detik).
export const maxDuration = 120;

const bodySchema = z.object({
  attachmentId: z.string().uuid(),
  title: z.string().max(200).optional(),
  /** Halaman asal untuk kembali setelah menghubungkan Canva. */
  returnPath: z.string().max(500).optional(),
});

/** Kirim file milik user (PPT, PDF, carousel, gambar) ke akun Canva-nya sebagai desain yang bisa diedit. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!(await guardRequest(s.user.id, req.headers))) return jsonError(429, "rate_limited");

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { attachmentId, title, returnPath } = parsed.data;

  // Kepemilikan dicek di importAttachmentToCanva (attachments.user_id = user ini).
  const result = await importAttachmentToCanva(s.user.id, attachmentId, title);
  if (result.ok) return NextResponse.json({ ok: true, editUrl: result.editUrl, viewUrl: result.viewUrl, designId: result.designId, title: result.title });

  const message = connectorsText(s.profile.language).errors[result.code];
  if (result.needsConnect) {
    return NextResponse.json({ ok: false, needsConnect: true, code: result.code, error: message, connectUrl: connectUrlFor("canva", safeReturnPath(returnPath, "/chat")) });
  }
  const status = result.code === "not_found" ? 404 : result.code === "unsupported_file" ? 415 : result.code === "rate_limited" ? 429 : result.code === "not_configured" ? 503 : 502;
  return NextResponse.json({ ok: false, code: result.code, error: message }, { status });
}
