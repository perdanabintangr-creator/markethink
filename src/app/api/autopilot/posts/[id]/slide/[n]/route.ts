import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBrand } from "@/lib/autopilot/generate";
import { renderSlide } from "@/lib/autopilot/render";
import type { Slide } from "@/lib/autopilot/slides";

export const maxDuration = 30;

/** Pratinjau satu slide (JPEG) — dirender langsung dari data slide dengan warna & logo Brand Kit. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id, n } = await params;
  const i = Number(n) - 1;
  if (!z.string().uuid().safeParse(id).success || !Number.isInteger(i) || i < 0 || i > 9) return jsonError(400, "invalid");
  const { data: row } = await s.supabase.from("social_posts").select("user_id, workspace_id, slides").eq("id", id).maybeSingle();
  if (!row || row.user_id !== s.user.id) return jsonError(404, "not_found");
  const slides = (row.slides ?? []) as Slide[];
  if (i >= slides.length) return jsonError(404, "not_found");
  const w = Number(new URL(req.url).searchParams.get("w")) || 1080;
  const brand = await loadBrand(createAdminClient(), s.user.id, row.workspace_id as string | null, s.profile.full_name);
  const jpg = await renderSlide(slides, i, { brand: brand.palette, logo: brand.logo, marqthinkLogo: brand.marqthinkLogo, en: s.profile.language === "en" }, Math.min(1080, Math.max(320, w)));
  return new Response(new Uint8Array(jpg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=600" },
  });
}
