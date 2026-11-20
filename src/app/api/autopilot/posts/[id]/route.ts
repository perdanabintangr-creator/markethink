import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { slideSchema } from "@/lib/autopilot/slides";
import { fixCaption, lintCaption, lintSlides } from "@/lib/autopilot/lint";
import { loadBrand } from "@/lib/autopilot/generate";
import { removeMedia, renderAndStore, type PostRow } from "@/lib/autopilot/media";
import { todayWib } from "@/lib/autopilot/plan";
import { isHero, type Slide } from "@/lib/autopilot/slides";
import { createVisual, MAX_IMAGE_REGENS } from "@/lib/autopilot/visuals";
import { publishPost } from "@/lib/autopilot/publish";
import { brandKeywordsOf } from "@/lib/autopilot/voice";

export const maxDuration = 180;

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("posted") }),
  z.object({ action: z.literal("publish_now") }),
  z.object({ action: z.literal("retry") }),
  z.object({ action: z.literal("regen_image"), visual: z.string().trim().min(3).max(400).optional() }),
  z.object({
    action: z.literal("update"),
    caption: z.string().max(2200).optional(),
    script: z.string().max(4000).optional(),
    postDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    postTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    slides: z.array(slideSchema).min(1).max(10).optional(),
  }),
]);

const COLS = "id, user_id, workspace_id, kind, design, status, slides, caption, title, script, alt_text, post_date, post_time, media, image_regens, permalink, error, updated_at";

/** ACC / tolak / kembalikan ke draf / tandai sudah tayang / edit satu konten Autopilot. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError(400, "invalid_id");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("light", `autopilot-post:${s.user.id}`)).ok) return jsonError(429, "rate_limited");

  // RLS: hanya konten milik user sendiri yang terbaca.
  const { data: row } = await s.supabase.from("social_posts").select(COLS).eq("id", id).maybeSingle<PostRow>();
  if (!row || row.user_id !== s.user.id) return jsonError(404, "not_found");
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const b = parsed.data;
  const save = async (patch: Record<string, unknown>) => {
    const { data, error } = await admin.from("social_posts").update({ ...patch, updated_at: now }).eq("id", id).eq("user_id", s.user.id).select(COLS).single();
    if (error) throw error;
    return data;
  };

  try {
    if (b.action === "approve") {
      if (row.status === "posted") return jsonError(409, "already_posted");
      if (row.kind === "reel") return NextResponse.json({ post: await save({ status: "script_ok", reviewed_at: now, error: null }) });
      if (!row.slides?.length) return jsonError(400, "no_slides");
      const paths = row.status === "approved" && row.media?.length ? row.media : await renderAndStore(admin, row, s.profile.language);
      return NextResponse.json({ post: await save({ status: "approved", media: paths, reviewed_at: now, error: null }) });
    }
    if (b.action === "reject") {
      if (row.status === "posted") return jsonError(409, "already_posted");
      await removeMedia(admin, s.user.id, row.media);
      return NextResponse.json({ post: await save({ status: "rejected", media: null, reviewed_at: now }) });
    }
    if (b.action === "restore") {
      if (row.status === "posted") return jsonError(409, "already_posted");
      await removeMedia(admin, s.user.id, row.media);
      return NextResponse.json({ post: await save({ status: "draft", media: null, reviewed_at: null }) });
    }
    if (b.action === "publish_now") {
      // Posting sekarang ke Instagram yang terhubung (konten harus sudah di-ACC).
      if (row.status !== "approved" || !row.media?.length) return jsonError(409, "not_approved");
      if (!(await checkRateLimit("user", `autopilot-pub:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
      const r = await publishPost(admin, row.id, { force: true });
      const { data: fresh } = await admin.from("social_posts").select(COLS).eq("id", id).single();
      if (r.result === "skipped") return jsonError(409, r.reason === "no_account" ? "ig_not_connected" : "busy", { post: fresh });
      if (r.result !== "posted") return jsonError(502, "publish_failed", { post: fresh, detail: r.error });
      return NextResponse.json({ post: fresh });
    }
    if (b.action === "retry") {
      if (row.status !== "failed") return jsonError(409, "not_failed");
      return NextResponse.json({ post: await save({ status: "approved", publish_attempts: 0, error: null, publish_started_at: null }) });
    }
    if (b.action === "regen_image") {
      // Buat ulang visual utama cover (maks 3× per konten; biaya gambar AI ditanggung paket).
      if (row.status === "posted") return jsonError(409, "already_posted");
      const cover = row.slides?.[0];
      const regens = Number((row as PostRow & { image_regens?: number }).image_regens ?? 0);
      if (!cover || row.kind === "reel" || (row.design ?? "classic") === "classic" || !isHero(cover, 0)) return jsonError(400, "no_visual");
      if (regens >= MAX_IMAGE_REGENS) return jsonError(429, "regen_limit");
      const visual = b.visual ?? cover.visual;
      if (!visual) return jsonError(400, "no_visual");
      if (!(await checkRateLimit("user", `autopilot-img:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
      const brand = await loadBrand(admin, s.user.id, row.workspace_id, s.profile.full_name);
      const path = await createVisual(admin, { userId: s.user.id, postId: row.id, look: row.design!, visual, brand: brand.palette });
      if (!path) return jsonError(502, "image_failed");
      const old = cover.image && cover.image !== path ? [cover.image] : [];
      await removeMedia(admin, s.user.id, [...old, ...(row.media ?? [])]);
      return NextResponse.json({
        post: await save({
          slides: [{ ...cover, visual, image: path }, ...row.slides.slice(1)],
          image_regens: regens + 1,
          ...(row.status === "approved" ? { status: "draft", media: null, reviewed_at: null } : {}),
        }),
      });
    }
    if (b.action === "posted") {
      if (!["approved", "script_ok", "manual", "failed"].includes(row.status)) return jsonError(409, "not_approved");
      return NextResponse.json({ post: await save({ status: "posted", posted_at: now }) });
    }

    // Edit: konten kembali ke draf (gambar dirender ulang saat di-ACC lagi).
    if (row.status === "posted") return jsonError(409, "already_posted");
    if (b.postDate && b.postDate < todayWib()) return jsonError(400, "past_date");
    const patch: Record<string, unknown> = {};
    if (b.caption !== undefined) patch.caption = fixCaption(b.caption);
    if (b.script !== undefined && row.kind === "reel") patch.script = b.script.trim();
    if (b.postDate) patch.post_date = b.postDate;
    if (b.postTime) patch.post_time = b.postTime;
    if (b.slides && row.kind !== "reel") {
      // `image` tidak pernah diambil dari input pengguna: path visual dipertahankan dari data lama per posisi slide.
      const next = (row.kind === "image" ? b.slides.slice(0, 1) : b.slides).map((sl: Slide, k: number) => {
        const c = { ...sl };
        delete c.image;
        const prevImage = row.slides?.[k]?.image;
        return prevImage ? { ...c, image: prevImage } : c;
      });
      patch.slides = next;
    }
    const contentChanged = patch.caption !== undefined || patch.slides !== undefined || patch.script !== undefined;
    if (contentChanged) {
      const brand = await loadBrand(admin, s.user.id, row.workspace_id, s.profile.full_name);
      const caption = (patch.caption as string | undefined) ?? row.caption;
      const slides = (patch.slides as PostRow["slides"] | undefined) ?? row.slides;
      const c = lintCaption(caption, { brandName: brand.palette.name, keywords: brandKeywordsOf(brand.kit), forbidden: brand.kit?.voice_dont });
      const sl = lintSlides(slides, row.kind, brand.kit?.voice_dont);
      patch.lint = { fails: [...c.fails, ...sl.fails], warns: [...c.warns, ...sl.warns] };
      if (row.status !== "rejected") {
        await removeMedia(admin, s.user.id, row.media);
        patch.status = "draft";
        patch.media = null;
        patch.reviewed_at = null;
      }
    }
    return NextResponse.json({ post: await save(patch) });
  } catch (err) {
    console.error("[autopilot] aksi gagal", b.action, err);
    return jsonError(500, "action_failed");
  }
}
