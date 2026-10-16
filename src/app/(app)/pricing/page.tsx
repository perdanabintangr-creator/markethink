import { Zap } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { UNLIMITED_CREDITS, quotaLeftPct } from "@/lib/addons/format";
import { toPlanOffer } from "@/lib/plan-offers";
import { PlanCards } from "@/components/tools/plan-cards";

export const metadata = { title: "Paket & harga" };
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const { supabase, user, profile } = await requireUser();
  const [{ data: rows }, credits] = await Promise.all([
    supabase
      .from("plans")
      .select("id, name, monthly_price_idr, monthly_credits")
      .in("id", ["beta", "starter", "pro", "promax"])
      .order("sort_order"),
    getCreditStatus(user.id),
  ]);
  const plans = (rows ?? []).map(toPlanOffer);
  const unlimited = credits.monthLimit >= UNLIMITED_CREDITS;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Paket & harga</h1>
          <p className="mt-1 text-muted-foreground">
            Satu paket untuk semuanya: chat, riset, gambar, Tools Pro & Agent memakai kuota bulanan yang sama. Kuota direset tiap tanggal 1.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm">
            <Zap className="size-4 text-primary" />
            {unlimited ? "Kuota kamu: tanpa batas (admin)" : `Kuota bulan ini tersisa ${quotaLeftPct(credits.remaining, credits.monthLimit)}%`}
          </p>
        </div>

        <PlanCards plans={plans} currentPlan={profile.plan_id} note="Dari halaman Paket & harga" />
      </div>
    </div>
  );
}
