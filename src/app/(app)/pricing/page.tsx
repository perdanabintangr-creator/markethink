import { Zap } from "lucide-react";
import { getSession, requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { UNLIMITED_CREDITS, quotaLeftPct } from "@/lib/addons/format";
import { PLAN_OFFER_COLUMNS, toPlanOffer } from "@/lib/plan-offers";
import { PlanCards } from "@/components/tools/plan-cards";
import { settingsText } from "@/lib/i18n/settings";

export async function generateMetadata() {
  const { profile } = await getSession();
  return { title: settingsText(profile?.language).pricingTitle };
}
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const { supabase, user, profile } = await requireUser();
  const [{ data: rows }, credits] = await Promise.all([
    supabase
      .from("plans")
      .select(PLAN_OFFER_COLUMNS)
      .in("id", ["beta", "starter", "pro", "promax"])
      .order("sort_order"),
    getCreditStatus(user.id),
  ]);
  const plans = (rows ?? []).map((r) => toPlanOffer(r));
  const unlimited = credits.monthLimit >= UNLIMITED_CREDITS;
  const t = settingsText(profile.language);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">{t.pricingTitle}</h1>
          <p className="mt-1 text-muted-foreground">{t.pricingDesc}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm">
            <Zap className="size-4 text-primary" />
            {unlimited ? t.pricingQuotaUnlimited : t.pricingQuotaLeft(quotaLeftPct(credits.remaining, credits.monthLimit))}
          </p>
        </div>

        <PlanCards plans={plans} currentPlan={profile.plan_id} note="Dari halaman Paket & harga" showTeam />
      </div>
    </div>
  );
}
