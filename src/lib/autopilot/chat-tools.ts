import "server-only";
import { randomUUID } from "crypto";
import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getContentAccess, postsInPeriod } from "./content-access";
import { loadBrand } from "./generate";
import { addDays, pickLook, planSlots, todayWib } from "./plan";
import { brandHashtag, capHashtags, fixCaption, lintCaption } from "./lint";
import { tidyPost } from "./tidy";
import { createVisual } from "./visuals";
import { brandKeywordsOf } from "./voice";
import { isHero, LOOKS, slideSchema, type Look, type Slide } from "./slides";
import { activeStyle } from "./styles-server";
import { baseOf } from "./style";
import { approvedDna, brandGate } from "@/lib/brand/server";

/**
 * Mode chat Instagram (adaptasi "Mode chat" skill marqthink-ig): dari chat Marqthink, pelanggan paket Autopilot Konten bisa minta
 * "buatkan carousel tentang …" → konten berdesain studio langsung masuk antrean ACC Autopilot; semua paket bisa
 * "cek caption ini".
 */

export interface InstagramToolCtx {
  admin: SupabaseClient;
  userId: string;
  planId: string;
  role: string;
  language: "id" | "en";
  fullName?: string | null;
  /** Project chat aktif (Brand Kit); null = pakai project di pengaturan Autopilot. */
  workspaceId: string | null;
}

export type InstagramPostOutput =
  | {
      ok: true;
      postId: string;
      title: string;
      kind: "carousel" | "image";
      design: Look;
      date: string;
      time: string;
      previews: string[];
      fails: string[];
      warns: string[];
      caption: string;
      hasVisual: boolean;
    }
  | { ok: false; error: string; upsell?: boolean };

const postInput = z.object({
  kind: z.enum(["carousel", "image"]).describe("carousel = 5–8 slide; image = single image 1 slide"),
  design: z.enum(LOOKS).optional().describe("glossy (terang 3D, edukasi), bold (hitam condensed, tren/angka), photo (foto penuh, relatable/produk), classic. Kosongkan = otomatis."),
  title: z.string().min(1).max(160).describe("Judul internal singkat"),
  pillar: z.string().max(40).optional(),
  slides: z.array(slideSchema).min(1).max(10),
  caption: z.string().min(1).max(2200),
  alt_text: z.string().max(500).optional(),
  product: z.string().max(120).optional().describe("Nama atau SKU produk dari katalog Autopilot user bila konten tentang produk tertentu (foto aslinya dipakai otomatis)"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Tanggal tayang bila user menyebutkan; kosong = slot kosong berikutnya"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
});

export function createInstagramTools(ctx: InstagramToolCtx) {
  return {
    instagram_post: tool({
      description:
        "Buat konten Instagram (carousel atau single image) dengan desain studio Autopilot Marqthink (Glossy 3D / Bold / Photo) memakai warna & logo Brand Kit, " +
        "lalu masukkan ke antrean ACC Autopilot (status draf; tidak diposting sebelum user ACC). Pakai saat user minta konten/carousel/post Instagram " +
        "atau 'masukkan ke jadwal'. ATURAN TULIS: slide 1 = hook ≤ 8 kata (boleh *satu kata* diapit bintang untuk serif miring), accent = janji; " +
        "carousel: cover → takaran → poin (satu ide/slide, body ≤ 25 kata) → list rangkuman → cta (satu ajakan). Slide 1 WAJIB punya `visual` " +
        "(deskripsi gambar utama BAHASA INGGRIS, satu subjek konkret, tanpa teks/logo) dan untuk glossy `corners` (4 frasa 2–3 kata). " +
        "Caption: kalimat pertama = hook berisi kata kunci, tanpa sapaan, tanpa link, 300–700 karakter, satu ajakan, 3–5 hashtag termasuk hashtag merek. " +
        "Jangan mengarang fakta/angka/testimoni. Setelah jadi, balas maks 3 baris (kartu sudah menampilkan pratinjau).",
      inputSchema: postInput,
      execute: async (raw): Promise<InstagramPostOutput> => {
        const allowance = await getContentAccess(ctx.admin, ctx.userId, ctx.role);
        if (!allowance)
          return {
            ok: false,
            upsell: true,
            error:
              "Desain studio + jadwal Autopilot ada di Paket Autopilot Konten (Lite Rp149rb, Pro Rp229rb, Bisnis Rp589rb per 30 hari; bisa dibeli semua paket). Tawarkan create_carousel sebagai gantinya, dan sebut singkat paket konten ini.",
          };
        if ((await postsInPeriod(ctx.admin, ctx.userId, allowance)) >= allowance.postsPerMonth)
          return { ok: false, error: "Jatah konten Autopilot periode ini sudah habis (30 hari sejak pembelian). Tawarkan create_carousel sebagai gantinya." };
        try {
          const { data: settings } = await ctx.admin.from("autopilot_settings").select("workspace_id, slot_times, design, style_id, style_preset").eq("user_id", ctx.userId).maybeSingle();
          const workspaceId = ctx.workspaceId ?? (settings?.workspace_id as string | null) ?? null;
          const gate = await brandGate(ctx.admin, ctx.userId, workspaceId);
          if (gate)
            return {
              ok: false,
              error:
                gate === "dna_not_approved"
                  ? "Brand DNA brand ini belum di-ACC. Minta user membuka menu Autopilot → Brand Onboarding untuk meninjau & ACC Brand DNA dulu."
                  : "Autopilot terkunci sampai Brand Onboarding lengkap (logo, 3–10 foto asli, target audiens, tujuan, lokasi, CTA). Minta user membuka menu Autopilot → Brand Onboarding.",
            };
          const brand = await loadBrand(ctx.admin, ctx.userId, workspaceId, ctx.fullName);
          const keywords = brandKeywordsOf(brand.kit);
          const brandDna = await approvedDna(ctx.admin, ctx.userId, workspaceId);

          // Jadwal: tanggal dari user (≥ besok) atau slot kosong berikutnya sesuai jam tayang di pengaturan.
          const tomorrow = addDays(todayWib(), 1);
          let date = raw.date && raw.date >= tomorrow ? raw.date : "";
          let time = raw.time ?? "";
          if (!date) {
            const { data: taken } = await ctx.admin.from("social_posts").select("post_date, post_time").eq("user_id", ctx.userId).neq("status", "rejected").gte("post_date", tomorrow).lte("post_date", addDays(tomorrow, 13));
            const set = new Set((taken ?? []).map((r) => `${r.post_date} ${String(r.post_time).slice(0, 5)}`));
            const times = ((settings?.slot_times as string[] | null) ?? ["12:00", "19:00"]).map((t) => t.slice(0, 5));
            const slot = planSlots(tomorrow, 1, times, set)[0] ?? planSlots(addDays(tomorrow, 7), 1, times, set)[0];
            date = slot?.date ?? tomorrow;
            time = time || slot?.time || "19:00";
          }
          if (!time) time = "19:00";

          // Gaya tetap pilihan brand (industri/referensi) diutamakan, kecuali user menyebut gaya lain.
          const dna = raw.design ? null : await activeStyle(ctx.admin, ctx.userId, settings ?? null);
          const design = dna ? baseOf(dna) : raw.design ?? pickLook((settings?.design as string | null) ?? "auto", undefined, Math.floor(Math.random() * 3), raw.kind);
          const t = tidyPost({ ...raw, date, time, design, slides: raw.slides as Slide[] }, brand.palette.name, keywords, brand.kit?.voice_dont);
          const id = randomUUID();
          const { error } = await ctx.admin.from("social_posts").insert({
            id,
            user_id: ctx.userId,
            workspace_id: workspaceId,
            batch_id: randomUUID(),
            post_date: date,
            post_time: time,
            kind: raw.kind,
            design,
            style: dna,
            title: raw.title.slice(0, 160),
            pillar: raw.pillar ?? null,
            slides: t.slides,
            caption: t.caption,
            alt_text: t.alt_text,
            note: "Dibuat dari chat",
            lint: t.lint,
            status: "draft",
            brand_dna_version: brandDna?.version ?? null,
          });
          if (error) throw error;

          // Produk dari katalog (cocokkan nama/SKU) → foto asli dipakai sebagai visual utama.
          let product: { id: string; name: string; photo_paths: string[] } | null = null;
          if (raw.product?.trim()) {
            const q = raw.product.trim().replace(/[%_,()]/g, " ").slice(0, 80);
            const { data: prods } = await ctx.admin.from("brand_products").select("id, name, sku, photo_paths").eq("user_id", ctx.userId).or(`name.ilike.%${q}%,sku.ilike.%${q}%`).limit(1);
            const p0 = prods?.[0];
            if (p0) {
              product = { id: p0.id as string, name: p0.name as string, photo_paths: (p0.photo_paths as string[]) ?? [] };
              await ctx.admin.from("social_posts").update({ product_id: product.id }).eq("id", id).eq("user_id", ctx.userId);
            }
          }
          let hasVisual = false;
          const cover = t.slides[0];
          if (design !== "classic" && cover && isHero(cover, 0) && (cover.visual || product?.photo_paths.length)) {
            const path = await createVisual(ctx.admin, {
              userId: ctx.userId,
              postId: id,
              look: design,
              visual: cover.visual || `${product?.name ?? "product"} hero shot`,
              brand: brand.palette,
              style: dna,
              product: product?.photo_paths.length ? product : null,
              timeoutMs: 70_000,
            });
            if (path) {
              hasVisual = true;
              await ctx.admin.from("social_posts").update({ slides: [{ ...cover, image: path }, ...t.slides.slice(1)] }).eq("id", id).eq("user_id", ctx.userId);
            }
          }
          const v = Date.now().toString(36);
          return {
            ok: true,
            postId: id,
            title: raw.title,
            kind: raw.kind,
            design,
            date,
            time,
            previews: t.slides.map((_, i) => `/api/autopilot/posts/${id}/slide/${i + 1}?w=540&v=${v}`),
            fails: t.lint.fails,
            warns: t.lint.warns.slice(0, 4),
            caption: t.caption,
            hasVisual,
          };
        } catch (err) {
          console.error("[autopilot] instagram_post gagal", err);
          return { ok: false, error: `Gagal membuat konten Instagram: ${(err instanceof Error ? err.message : String(err)).slice(0, 300)}` };
        }
      },
    }),

    check_caption: tool({
      description:
        "Periksa caption Instagram dengan linter Marqthink (hook, sapaan, link, jumlah & kualitas hashtag, hashtag merek, frasa klise AI, tanda pisah, emoji, ajakan). " +
        "Pakai saat user minta 'cek caption ini' atau sebelum menyarankan caption final. Laporkan FAIL (wajib diperbaiki) & WARN (saran) lalu beri versi perbaikan tanpa mengubah makna.",
      inputSchema: z.object({ caption: z.string().min(1).max(4000) }),
      execute: async ({ caption }) => {
        const { data: settings } = await ctx.admin.from("autopilot_settings").select("workspace_id").eq("user_id", ctx.userId).maybeSingle();
        const brand = await loadBrand(ctx.admin, ctx.userId, ctx.workspaceId ?? (settings?.workspace_id as string | null) ?? null, ctx.fullName);
        const cleaned = capHashtags(fixCaption(caption), brandHashtag(brand.palette.name));
        const r = lintCaption(caption, { brandName: brand.palette.name, keywords: brandKeywordsOf(brand.kit), forbidden: brand.kit?.voice_dont });
        return { ok: true, fails: r.fails, warns: r.warns, cleaned: cleaned !== caption ? cleaned : null, length: caption.length };
      },
    }),
  };
}

export function instagramCapabilities(allowed: boolean) {
  return allowed
    ? "- **Instagram (Autopilot):** bila user minta konten/carousel/post Instagram, panggil `instagram_post` (desain studio + masuk antrean ACC Autopilot). `create_carousel` tetap dipakai untuk TikTok/LinkedIn/poster/flyer atau bila user minta file saja. Bila user minta 'cek caption', panggil `check_caption`."
    : "- **Cek caption:** bila user minta 'cek caption ini', panggil `check_caption` lalu laporkan FAIL/WARN + versi perbaikan.";
}
