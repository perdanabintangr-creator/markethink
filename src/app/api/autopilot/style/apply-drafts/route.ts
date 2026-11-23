import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContentAccess } from "@/lib/autopilot/content-access";
import { activeStyle } from "@/lib/autopilot/styles-server";
import { baseOf } from "@/lib/autopilot/style";
import { todayWib } from "@/lib/autopilot/plan";

/**
 * "Terapkan gaya ini ke draf": draf yang belum tayang (hari ini ke depan) didesain ulang dengan gaya aktif tanpa menulis
 * ulang isi. Gambar yang sudah ada tetap dipakai, jadi tidak ada biaya AI tambahan. Reel tidak diubah (tanpa desain).
 */
export async function POST() {
  const s = await apiSession();
  if (s.error) return s.error;
  const admin = createAdminClient();
  if (!(await getContentAccess(admin, s.user.id, s.profile.role))) return jsonError(403, "plan");
  if (!(await checkRateLimit("light", `autopilot-apply-style:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const { data: settings } = await admin.from("autopilot_settings").select("style_id, style_preset").eq("user_id", s.user.id).maybeSingle();
  const dna = await activeStyle(admin, s.user.id, settings ?? null);
  if (!dna) return jsonError(400, "no_style");
  const { data, error } = await admin
    .from("social_posts")
    .update({ style: dna, design: baseOf(dna), updated_at: new Date().toISOString() })
    .eq("user_id", s.user.id)
    .eq("status", "draft")
    .neq("kind", "reel")
    .gte("post_date", todayWib())
    .select("id");
  if (error) return jsonError(500, "save_failed");
  return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
}
