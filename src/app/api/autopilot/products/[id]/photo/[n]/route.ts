import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

/** Foto produk (thumbnail di halaman Autopilot) lewat signed URL singkat. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id, n } = await params;
  const i = Number(n);
  if (!z.string().uuid().safeParse(id).success || !Number.isInteger(i) || i < 0 || i > 2) return jsonError(400, "invalid");
  const { data: row } = await s.supabase.from("brand_products").select("photo_paths").eq("id", id).maybeSingle();
  const path = (row?.photo_paths as string[] | undefined)?.[i];
  if (!path || !path.startsWith(`${s.user.id}/`) || path.includes("..")) return jsonError(404, "not_found");
  const { data } = await createAdminClient().storage.from("uploads").createSignedUrl(path, 300);
  if (!data) return jsonError(500, "sign_failed");
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, max-age=240" } });
}
