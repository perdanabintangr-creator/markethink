import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { autopilotAllowance } from "@/lib/autopilot/quota";
import { MAX_PRODUCT_PHOTOS, MAX_PRODUCTS, productInput } from "@/lib/autopilot/products";

const COLS = "id, name, sku, price, description, photo_paths, active, workspace_id, updated_at";

/** Tambah / ubah produk katalog Autopilot (foto dari lampiran milik user sendiri). */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!autopilotAllowance(s.profile.plan_id, s.profile.role)) return jsonError(403, "plan");
  const parsed = productInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("light", `autopilot-product:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const b = parsed.data;
  const admin = createAdminClient();

  let existing: string[] = [];
  if (b.id) {
    const { data: row } = await s.supabase.from("brand_products").select("photo_paths").eq("id", b.id).maybeSingle();
    if (!row) return jsonError(404, "not_found");
    existing = b.replacePhotos ? [] : ((row.photo_paths as string[]) ?? []);
  } else {
    const { count } = await admin.from("brand_products").select("id", { count: "exact", head: true }).eq("user_id", s.user.id);
    if ((count ?? 0) >= MAX_PRODUCTS) return jsonError(400, "too_many");
  }
  let added: string[] = [];
  if (b.attachmentIds?.length) {
    // RLS: hanya lampiran milik user; hanya gambar dari folder user sendiri.
    const { data: atts } = await s.supabase.from("attachments").select("storage_path, mime").in("id", b.attachmentIds);
    added = (atts ?? [])
      .filter((a) => String(a.mime).startsWith("image/"))
      .map((a) => String(a.storage_path))
      .filter((p) => p.startsWith(`${s.user.id}/`) && !p.includes(".."));
  }
  if (b.workspaceId) {
    const { data: ws } = await s.supabase.from("workspaces").select("id").eq("id", b.workspaceId).maybeSingle();
    if (!ws) return jsonError(404, "workspace_not_found");
  }
  const row = {
    user_id: s.user.id,
    name: b.name,
    sku: b.sku || null,
    price: b.price || null,
    description: b.description || null,
    active: b.active,
    photo_paths: [...added, ...existing].slice(0, MAX_PRODUCT_PHOTOS),
    ...(b.workspaceId !== undefined ? { workspace_id: b.workspaceId } : {}),
    updated_at: new Date().toISOString(),
  };
  const q = b.id ? admin.from("brand_products").update(row).eq("id", b.id).eq("user_id", s.user.id) : admin.from("brand_products").insert(row);
  const { data, error } = await q.select(COLS).single();
  if (error) return jsonError(500, "save_failed");
  return NextResponse.json({ product: data });
}
