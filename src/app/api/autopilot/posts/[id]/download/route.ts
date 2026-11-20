import JSZip from "jszip";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBrand } from "@/lib/autopilot/generate";
import { renderSlides } from "@/lib/autopilot/render";
import { downloadMedia, type PostRow } from "@/lib/autopilot/media";

export const maxDuration = 60;

/** Unduh satu konten: semua slide JPG 1080×1350 + caption (dan naskah untuk Reel) dalam satu ZIP. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError(400, "invalid_id");
  const { data: row } = await s.supabase
    .from("social_posts")
    .select("id, user_id, workspace_id, kind, status, slides, caption, title, script, alt_text, post_date, post_time, media")
    .eq("id", id)
    .maybeSingle<PostRow>();
  if (!row || row.user_id !== s.user.id) return jsonError(404, "not_found");
  const admin = createAdminClient();
  const zip = new JSZip();
  try {
    let jpgs: Buffer[] = [];
    if (row.kind !== "reel" && row.slides?.length) {
      if (row.media?.length) jpgs = await downloadMedia(admin, s.user.id, row.media);
      else {
        const brand = await loadBrand(admin, s.user.id, row.workspace_id, s.profile.full_name);
        jpgs = await renderSlides(row.slides, { brand: brand.palette, logo: brand.logo, marqthinkLogo: brand.marqthinkLogo, en: s.profile.language === "en" });
      }
    }
    jpgs.forEach((b, i) => zip.file(`slide-${String(i + 1).padStart(2, "0")}.jpg`, b));
    zip.file("caption.txt", row.caption);
    if (row.alt_text) zip.file("alt-text.txt", row.alt_text);
    if (row.script) zip.file("naskah-reel.txt", row.script);
    const buf = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
    const name = `${row.post_date}-${row.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "konten"}.zip`;
    return new Response(buf as unknown as BodyInit, {
      headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[autopilot] unduh gagal", err);
    return jsonError(500, "download_failed");
  }
}
