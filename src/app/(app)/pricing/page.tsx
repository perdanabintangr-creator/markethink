import { Zap } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { TOOL_CREDIT_ESTIMATE } from "@/lib/addons/format";
import { toPlanOffer } from "@/lib/plan-offers";
import { PlanCards } from "@/components/tools/plan-cards";

export const metadata = { title: "Paket & harga" };
export const dynamic = "force-dynamic";

/** Contoh pemakaian kredit (perkiraan; dipotong sesuai biaya nyata). */
const USAGE = [
  ["Chat ringan (otak Junior)", "±1"],
  ["Chat strategi (otak Senior)", "±8"],
  ["Chat + riset web", "+3"],
  ["Buat gambar", "6"],
  ["1 hasil Tools Pro (Senior)", `±${TOOL_CREDIT_ESTIMATE.senior}`],
  ["1 hasil Tools Pro (Associate)", `±${TOOL_CREDIT_ESTIMATE.associate}`],
  ["1 hasil Tools Pro (Director)", `±${TOOL_CREDIT_ESTIMATE.director}`],
];

export default async function PricingPage() {
  const { supabase, user, profile } = await requireUser();
  const [{ data: rows }, credits] = await Promise.all([
    supabase.from("plans").select("id, name, monthly_price_idr, monthly_credits").in("id", ["beta", "starter", "pro", "promax"]).order("sort_order"),
    getCreditStatus(user.id),
  ]);
  const plans = (rows ?? []).map(toPlanOffer);
  const unlimited = credits.monthLimit >= 1_000_000;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Paket & harga</h1>
          <p className="mt-1 text-muted-foreground">
            Satu paket untuk semuanya: chat, riset, gambar, Tools Pro & Agent memakai kredit bulanan yang sama. Kredit dipotong sesuai pemakaian nyata dan
            direset tiap tanggal 1.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm">
            <Zap className="size-4 text-primary" />
            {unlimited ? "Kredit kamu: tanpa batas (admin)" : `Sisa kredit kamu: ${credits.remaining.toLocaleString("id-ID")} / ${credits.monthLimit.toLocaleString("id-ID")}`}
          </p>
        </div>

        <PlanCards plans={plans} currentPlan={profile.plan_id} note="Dari halaman Paket & harga" />

        <section className="rounded-2xl border bg-card p-4 sm:p-6">
          <h2 className="font-semibold">Kira-kira 1 kredit dipakai untuk apa?</h2>
          <p className="text-sm text-muted-foreground">Perkiraan rata-rata. Yang dipotong selalu pemakaian nyata — kalau gagal, kredit kembali penuh.</p>
          <ul className="mt-3 divide-y text-sm">
            {USAGE.map(([k, v]) => (
              <li key={k} className="flex justify-between py-2">
                <span>{k}</span>
                <span className="font-medium tabular-nums">{v} kredit</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
