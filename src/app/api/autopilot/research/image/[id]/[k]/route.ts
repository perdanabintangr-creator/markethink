import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

/** Gambar temuan riset (disimpan di folder user) lewat signed URL singkat. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; k: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id, k } = await params;
  const i = Number(k);
  if (!z.string().uuid().safeParse(id).success || !Number.isInteger(i) || i < 0 || i > 20) return jsonError(400, "invalid");
  const { data } = await s.supabase.from("brand_research").select("images").eq("id", id).maybeSingle();
  const path = (data?.images as { path?: string | null }[] | undefined)?.[i]?.path;
  if (!path || !path.startsWith(`${s.user.id}/`) || path.includes("..")) return jsonError(404, "not_found");
  const { data: signed } = await createAdminClient().storage.from("uploads").createSignedUrl(path, 300);
  if (!signed) return jsonError(500, "sign_failed");
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "private, max-age=240" } });
}
