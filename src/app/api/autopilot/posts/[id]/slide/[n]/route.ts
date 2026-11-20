import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderSlide } from "@/lib/autopilot/render";
import { renderOptions } from "@/lib/autopilot/media";
import type { Look, Slide } from "@/lib/autopilot/slides";

export const maxDuration = 30;

/** Pratinjau satu slide (JPEG) — dirender langsung dari data slide dengan warna & logo Brand Kit. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id, n } = await params;
  const i = Number(n) - 1;
  if (!z.string().uuid().safeParse(id).success || !Number.isInteger(i) || i < 0 || i > 9) return jsonError(400, "invalid");
  const { data: row } = await s.supabase.from("social_posts").select("user_id, workspace_id, slides, design").eq("id", id).maybeSingle();
  if (!row || row.user_id !== s.user.id) return jsonError(404, "not_found");
  const slides = (row.slides ?? []) as Slide[];
  if (i >= slides.length) return jsonError(404, "not_found");
  const w = Number(new URL(req.url).searchParams.get("w")) || 1080;
  // Visual hanya dimuat untuk slide yang memakainya (cover).
  const opts = await renderOptions(
    createAdminClient(),
    { user_id: s.user.id, workspace_id: row.workspace_id as string | null, slides: i === 0 ? slides : slides.map((x) => ({ ...x, image: undefined })), design: row.design as Look },
    s.profile.language,
    s.profile.full_name,
  );
  const jpg = await renderSlide(slides, i, opts, Math.min(1080, Math.max(320, w)));
  return new Response(new Uint8Array(jpg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=600" },
  });
}
