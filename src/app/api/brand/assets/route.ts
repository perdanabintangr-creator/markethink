import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASSET_KINDS, MAX_REAL_PHOTOS, MAX_SCREENSHOTS } from "@/lib/brand/onboarding";

const body = z.object({
  workspaceId: z.string().uuid(),
  kind: z.enum(ASSET_KINDS),
  attachmentIds: z.array(z.string().uuid()).min(1).max(10),
});

/** Tambah aset onboarding (logo, foto asli, screenshot) dari lampiran milik user sendiri. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("light", `brand-assets:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const b = parsed.data;
  const admin = createAdminClient();
  const { data: ws } = await s.supabase.from("workspaces").select("id, brand_kit").eq("id", b.workspaceId).maybeSingle();
  if (!ws) return jsonError(404, "workspace_not_found");
  // RLS: hanya lampiran gambar milik user, di folder user sendiri.
  const { data: atts } = await s.supabase.from("attachments").select("id, storage_path, mime").in("id", b.attachmentIds);
  const files = (atts ?? []).filter((a) => String(a.mime).startsWith("image/") && String(a.storage_path).startsWith(`${s.user.id}/`) && !String(a.storage_path).includes(".."));
  if (!files.length) return jsonError(400, "no_images");

  const { data: existing } = await admin.from("brand_assets").select("id, kind").eq("workspace_id", b.workspaceId).eq("user_id", s.user.id);
  const have = existing ?? [];
  let take = files;
  if (b.kind === "logo") {
    take = files.slice(0, 1);
    const old = have.filter((a) => a.kind === "logo").map((a) => a.id as string);
    if (old.length) await admin.from("brand_assets").delete().in("id", old).eq("user_id", s.user.id);
  } else if (b.kind === "real_photo") {
    take = files.slice(0, Math.max(0, MAX_REAL_PHOTOS - have.filter((a) => a.kind === "real_photo").length));
  } else {
    take = files.slice(0, Math.max(0, MAX_SCREENSHOTS - have.filter((a) => a.kind === b.kind).length));
  }
  if (!take.length) return jsonError(400, "too_many");
  const { data: rows, error } = await admin
    .from("brand_assets")
    .insert(
      take.map((f) => ({
        user_id: s.user.id,
        workspace_id: b.workspaceId,
        kind: b.kind,
        storage_path: f.storage_path,
      })),
    )
    .select("id, kind");
  if (error) return jsonError(500, "save_failed");
  // Logo juga menjadi logo Brand Kit (dipakai di desain slide).
  if (b.kind === "logo") {
    const kit = {
      ...((ws.brand_kit ?? {}) as Record<string, unknown>),
      logo_id: take[0].id,
    };
    await admin.from("workspaces").update({ brand_kit: kit, updated_at: new Date().toISOString() }).eq("id", b.workspaceId).eq("user_id", s.user.id);
  }
  return NextResponse.json({ assets: rows });
}
