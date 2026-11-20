import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderSlides } from "./render";
import { loadBrand } from "./generate";
import type { Slide } from "./slides";

export interface PostRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  kind: "carousel" | "image" | "reel";
  status: string;
  slides: Slide[];
  caption: string;
  title: string;
  script: string | null;
  alt_text: string | null;
  post_date: string;
  post_time: string;
  media: string[] | null;
}

const BUCKET = "uploads";

/** Render slide → JPEG 1080×1350 lalu simpan ke storage milik user. Mengembalikan path file. */
export async function renderAndStore(admin: SupabaseClient, post: PostRow, language: "id" | "en" = "id") {
  const brand = await loadBrand(admin, post.user_id, post.workspace_id);
  const jpgs = await renderSlides(post.slides, { brand: brand.palette, logo: brand.logo, marqthinkLogo: brand.marqthinkLogo, en: language === "en" });
  const stamp = Date.now().toString(36);
  const paths = jpgs.map((_, i) => `${post.user_id}/autopilot/${post.id}/${stamp}-${String(i + 1).padStart(2, "0")}.jpg`);
  await Promise.all(
    jpgs.map((buf, i) => admin.storage.from(BUCKET).upload(paths[i], buf, { contentType: "image/jpeg", upsert: true }).then(({ error }) => {
      if (error) throw error;
    })),
  );
  return paths;
}

/** Hapus file hasil render lama (aman: hanya path di folder autopilot milik user). */
export async function removeMedia(admin: SupabaseClient, userId: string, paths: string[] | null) {
  const safe = (paths ?? []).filter((p) => p.startsWith(`${userId}/autopilot/`) && !p.includes(".."));
  if (safe.length) await admin.storage.from(BUCKET).remove(safe);
}

export async function downloadMedia(admin: SupabaseClient, userId: string, paths: string[]) {
  return Promise.all(
    paths.map(async (p) => {
      if (!p.startsWith(`${userId}/autopilot/`) || p.includes("..")) throw new Error("invalid_path");
      const { data, error } = await admin.storage.from(BUCKET).download(p);
      if (error || !data) throw error ?? new Error("download_failed");
      return Buffer.from(await data.arrayBuffer());
    }),
  );
}
