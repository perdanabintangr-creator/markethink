import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBrand } from "@/lib/autopilot/generate";
import { renderSlide } from "@/lib/autopilot/render";
import { presetById } from "@/lib/autopilot/presets";
import { baseOf, parseDna } from "@/lib/autopilot/style";
import { sampleSlides } from "@/lib/autopilot/samples";

export const maxDuration = 30;

/** Pratinjau gaya (pustaka industri atau gaya referensi milik user) dengan warna & logo brand, tanpa biaya AI. */
export async function GET(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const url = new URL(req.url);
  const n = Number(url.searchParams.get("n") ?? "1");
  const en = s.profile.language === "en";
  const slides = sampleSlides(en);
  if (!Number.isInteger(n) || n < 1 || n > slides.length) return jsonError(400, "invalid");
  if (!(await checkRateLimit("light", `autopilot-sample:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const styleId = url.searchParams.get("style");
  let dna = presetById(url.searchParams.get("preset"))?.dna ?? null;
  if (styleId && z.string().uuid().safeParse(styleId).success) {
    const { data } = await s.supabase.from("brand_styles").select("dna").eq("id", styleId).maybeSingle();
    dna = parseDna(data?.dna);
  }
  if (!dna) return jsonError(404, "style_not_found");
  const ws = url.searchParams.get("ws");
  const brand = await loadBrand(createAdminClient(), s.user.id, ws && z.string().uuid().safeParse(ws).success ? ws : null, s.profile.full_name);
  const jpg = await renderSlide(slides, n - 1, { brand: brand.palette, logo: brand.logo, marqthinkLogo: brand.marqthinkLogo, en, look: baseOf(dna), style: dna }, 432);
  return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=600" } });
}
