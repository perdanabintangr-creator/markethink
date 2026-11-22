import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { promoPrice } from "@/lib/plan-offers";
import { CONTENT_PLANS, CONTENT_PLAN_IDS, isContentPlanId, type ContentPlanId } from "./quota";

/** Paket Autopilot Konten yang ditawarkan (harga dari tabel content_plans, promo bila aktif). */
export interface ContentOffer {
  id: ContentPlanId;
  name: string;
  tagline: string | null;
  price: number;
  originalPrice?: number;
  promoLabel?: string;
  postsPerWeek: number;
  postsPerMonth: number;
  innerVisuals: number;
}

/** Bundel paket Marqthink + paket konten. */
export interface ComboOffer {
  id: string;
  name: string;
  price: number;
  /** Harga normal kedua paket bila dibeli terpisah. */
  listTotal: number;
  planId: string;
  planName: string;
  planPrice: number;
  contentPlanId: ContentPlanId;
  contentName: string;
  contentPrice: number;
}

export async function getContentOffers(admin: SupabaseClient): Promise<{ plans: ContentOffer[]; combos: ComboOffer[] }> {
  const [{ data: rows }, { data: comboRows }] = await Promise.all([
    admin.from("content_plans").select("id, name, tagline, price_idr, promo_price_idr, promo_label, promo_until, posts_per_week, posts_per_month, inner_visuals, is_active").order("sort_order"),
    admin.from("combo_offers").select("id, name, plan_id, content_plan_id, price_idr, is_active").eq("is_active", true).order("sort_order"),
  ]);
  const plans: ContentOffer[] = (rows?.length ? rows : CONTENT_PLAN_IDS.map((id) => ({ id, name: CONTENT_PLANS[id].name, tagline: null, price_idr: CONTENT_PLANS[id].price, promo_price_idr: null, promo_label: null, promo_until: null, posts_per_week: CONTENT_PLANS[id].postsPerWeek, posts_per_month: CONTENT_PLANS[id].postsPerMonth, inner_visuals: CONTENT_PLANS[id].innerVisuals, is_active: true })))
    .filter((r) => r.is_active !== false && isContentPlanId(String(r.id)))
    .map((r) => {
      const list = Number(r.price_idr);
      const promo = promoPrice(list, r.promo_price_idr as number | null, r.promo_until as string | null);
      return {
        id: r.id as ContentPlanId,
        name: String(r.name),
        tagline: (r.tagline as string | null) ?? null,
        price: promo ?? list,
        ...(promo !== null && { originalPrice: list, ...(r.promo_label && { promoLabel: String(r.promo_label) }) }),
        postsPerWeek: Number(r.posts_per_week),
        postsPerMonth: Number(r.posts_per_month),
        innerVisuals: Number(r.inner_visuals),
      };
    });
  const planIds = [...new Set((comboRows ?? []).map((c) => String(c.plan_id)))];
  const { data: basePlans } = planIds.length ? await admin.from("plans").select("id, name, monthly_price_idr").in("id", planIds) : { data: [] };
  const combos: ComboOffer[] = [];
  for (const c of comboRows ?? []) {
    const plan = (basePlans ?? []).find((p) => p.id === c.plan_id);
    const content = plans.find((p) => p.id === c.content_plan_id);
    if (!plan || !content) continue;
    const planPrice = Number(plan.monthly_price_idr);
    const contentPrice = content.originalPrice ?? content.price;
    combos.push({
      id: String(c.id),
      name: String(c.name),
      price: Number(c.price_idr),
      listTotal: planPrice + contentPrice,
      planId: String(c.plan_id),
      planName: String(plan.name),
      planPrice,
      contentPlanId: content.id,
      contentName: content.name,
      contentPrice,
    });
  }
  return { plans, combos };
}
