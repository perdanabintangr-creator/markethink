import { redirect } from "next/navigation";
import { PlanCards } from "@/components/tools/plan-cards";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { isSupabaseConfigured } from "@/lib/env";
import { PLAN_OFFER_COLUMNS, toPlanOffer } from "@/lib/plan-offers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContentOffers } from "@/lib/autopilot/content-offers";
import { ContentPackages } from "@/components/autopilot/content-packages";

export const metadata = {
  title: "Harga",
  description: `Paket ${BRAND}: mulai gratis, upgrade mulai Rp59 ribu/bulan. Semua Smart Tools di paket Pro & Promax. Autopilot Konten mulai Rp149 ribu/30 hari.`,
};

/** Halaman harga publik (tanpa login). User yang sudah login diarahkan ke halaman paket di aplikasi (bisa langsung bayar). */
export default async function PublicPricingPage() {
  const { user } = isSupabaseConfigured() ? await getSession() : { user: null };
  if (user) redirect("/pricing");
  const { data: rows } = await createAdminClient()
    .from("plans")
    .select(PLAN_OFFER_COLUMNS)
    .in("id", ["beta", "starter", "pro", "promax"])
    .order("sort_order");
  const plans = (rows ?? []).map((r) => toPlanOffer(r));
  const offers = await getContentOffers(createAdminClient());

  return (
    <div className="min-h-dvh">
      <SiteHeader loggedIn={false} />
      <section className="relative isolate overflow-hidden bg-[#050b1f] pb-24 text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[50rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(10,108,255,0.35),transparent_60%)]" />
        <div className="mx-auto max-w-3xl px-4 pt-16 text-center sm:pt-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Harga</p>
          <h1 className="mt-3 font-brand text-4xl font-black tracking-tight sm:text-6xl">Investasi kecil, otak marketing penuh.</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/60">Mulai gratis. Upgrade kapan saja, berhenti kapan saja. Semua Smart Tools terbuka di paket Pro & Promax.</p>
        </div>
      </section>
      <section className="relative -mt-16 px-4 pb-20">
        <div className="mx-auto max-w-6xl rounded-3xl border bg-background p-4 shadow-2xl sm:p-6">
          <PlanCards plans={plans} note="Dari halaman Harga publik" showTeam signupHref="/register?next=/pricing" />
        </div>
        <div className="mx-auto mt-10 max-w-6xl rounded-3xl border bg-background p-4 shadow-2xl sm:p-6">
          <ContentPackages lang="id" plans={offers.plans} combos={offers.combos} current={null} signupHref="/register?next=/autopilot" />
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          Pembayaran aman lewat QRIS, e-wallet & virtual account. Paket aktif otomatis begitu pembayaran berhasil.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
