import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBrand } from "@/lib/autopilot/generate";
import { renderSlide } from "@/lib/autopilot/render";
import { sampleSlides } from "@/lib/autopilot/samples";

export const maxDuration = 30;

/** Contoh slide dengan warna & logo brand pelanggan (pratinjau gaya di halaman Autopilot, termasuk untuk upsell). */
export async function GET(req: Request, { params }: { params: Promise<{ n: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const i = Number((await params).n) - 1;
  const en = s.profile.language === "en";
  const slides = sampleSlides(en);
  if (!Number.isInteger(i) || i < 0 || i >= slides.length) return jsonError(400, "invalid");
  if (!(await checkRateLimit("light", `autopilot-sample:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const ws = new URL(req.url).searchParams.get("ws");
  const workspaceId = ws && z.string().uuid().safeParse(ws).success ? ws : null;
  const brand = await loadBrand(createAdminClient(), s.user.id, workspaceId, s.profile.full_name);
  const jpg = await renderSlide(slides, i, { brand: brand.palette, logo: brand.logo, marqthinkLogo: brand.marqthinkLogo, en }, 540);
  return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
}
