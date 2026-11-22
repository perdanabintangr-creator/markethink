import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_ALLOWANCE, CONTENT_PLANS, isContentPlanId, monthStartWib, type ContentAccess } from "./quota";

/**
 * Hak pakai Autopilot Konten & Kalender Konten: paket konten yang masih aktif (content_subscriptions), atau admin.
 * Null = belum berlangganan (tampilkan penawaran paket konten).
 */
export async function getContentAccess(admin: SupabaseClient, userId: string, role?: string | null): Promise<ContentAccess | null> {
  if (role === "admin") return { ...ADMIN_ALLOWANCE, planId: "admin", name: "Admin", periodStart: monthStartWib().toISOString(), periodEnd: null };
  const nowIso = new Date().toISOString();
  const { data: subs } = await admin
    .from("content_subscriptions")
    .select("content_plan_id, period_start, period_end")
    .eq("user_id", userId)
    .is("refunded_at", null)
    .lte("period_start", nowIso)
    .gt("period_end", nowIso)
    .order("period_start", { ascending: false })
    .limit(1);
  const cur = subs?.[0];
  if (!cur || !isContentPlanId(String(cur.content_plan_id))) return null;
  const planId = cur.content_plan_id as keyof typeof CONTENT_PLANS;
  const { data: plan } = await admin.from("content_plans").select("name, posts_per_week, posts_per_month, inner_visuals").eq("id", planId).maybeSingle();
  const base = CONTENT_PLANS[planId];
  // Masa aktif terjauh (perpanjangan yang sudah dibayar ikut dihitung).
  const { data: last } = await admin
    .from("content_subscriptions")
    .select("period_end")
    .eq("user_id", userId)
    .is("refunded_at", null)
    .gt("period_end", nowIso)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    planId,
    name: (plan?.name as string | undefined) ?? base.name,
    postsPerWeek: Number(plan?.posts_per_week ?? base.postsPerWeek),
    postsPerMonth: Number(plan?.posts_per_month ?? base.postsPerMonth),
    innerVisuals: Number(plan?.inner_visuals ?? base.innerVisuals),
    periodStart: String(cur.period_start),
    periodEnd: (last?.period_end as string | undefined) ?? String(cur.period_end),
  };
}

/** Jumlah post Autopilot yang dibuat dalam periode berjalan (jatah 30 hari). */
export async function postsInPeriod(admin: SupabaseClient, userId: string, access: Pick<ContentAccess, "periodStart">) {
  const { count } = await admin.from("social_posts").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", access.periodStart);
  return count ?? 0;
}
