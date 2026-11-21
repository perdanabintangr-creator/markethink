import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

/** Gambar aset onboarding (thumbnail) lewat signed URL singkat. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError(400, "invalid_id");
  const { data: row } = await s.supabase.from("brand_assets").select("storage_path").eq("id", id).maybeSingle();
  const path = row?.storage_path as string | undefined;
  if (!path || !path.startsWith(`${s.user.id}/`) || path.includes("..")) return jsonError(404, "not_found");
  const { data } = await createAdminClient().storage.from("uploads").createSignedUrl(path, 300);
  if (!data) return jsonError(500, "sign_failed");
  return NextResponse.redirect(data.signedUrl, {
    headers: { "Cache-Control": "private, max-age=240" },
  });
}

/** Hapus aset onboarding (file lampiran asli tetap ada). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError(400, "invalid_id");
  const admin = createAdminClient();
  const { data: row } = await admin.from("brand_assets").select("kind, workspace_id").eq("id", id).eq("user_id", s.user.id).maybeSingle();
  if (!row) return jsonError(404, "not_found");
  await admin.from("brand_assets").delete().eq("id", id).eq("user_id", s.user.id);
  if (row.kind === "logo" && row.workspace_id) {
    const { data: ws } = await admin.from("workspaces").select("brand_kit").eq("id", row.workspace_id).eq("user_id", s.user.id).maybeSingle();
    const kit = { ...((ws?.brand_kit ?? {}) as Record<string, unknown>) };
    delete kit.logo_id;
    await admin.from("workspaces").update({ brand_kit: kit }).eq("id", row.workspace_id).eq("user_id", s.user.id);
  }
  return NextResponse.json({ ok: true });
}
