"use client";

import { useState } from "react";
import {
  Bot,
  Brain,
  Briefcase,
  Camera,
  CheckCircle2,
  Crown,
  FolderOpen,
  Gauge,
  Gem,
  Globe,
  Headset,
  ImageIcon,
  Images,
  Loader2,
  MessageSquare,
  Presentation,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RECOMMENDED_PLAN, type PlanOffer } from "@/lib/plan-offers";
import { useApp } from "@/components/app/app-context";
import { toolsText } from "@/lib/i18n/tools";
import { plansText, type PlanDetail, type PlanIcon } from "@/lib/i18n/plans";
import { paymentsText } from "@/lib/i18n/payments";
import { startCheckout } from "./checkout";

const ICONS: Record<PlanIcon, LucideIcon> = {
  chat: MessageSquare,
  web: Globe,
  image: ImageIcon,
  project: FolderOpen,
  brain: Brain,
  tools: Briefcase,
  deck: Presentation,
  photo: Camera,
  privacy: ShieldCheck,
  sharp: Sparkles,
  agent: Bot,
  visual: Images,
  edit: Wand2,
  crown: Crown,
  signature: Gem,
  quota: Gauge,
  team: Users,
  support: Headset,
};

/**
 * Kartu paket ala halaman harga ChatGPT/Claude: nama & slogan, tombol di atas harga, lalu "Semua di X, plus:" + keunggulan berikon.
 * Angka kredit & batas tidak ditampilkan (besar kuota ditulis dengan kata). Permintaan masuk ke back office → Calon pelanggan untuk dikirimi cara bayar.
 * `showTeam` menampilkan tab Personal / Tim & Agency (halaman Paket & harga).
 */
export function PlanCards({ plans, currentPlan, note, showTeam }: { plans: PlanOffer[]; currentPlan?: string; note: string; showTeam?: boolean }) {
  const { lang, payEnabled } = useApp();
  const PAY = paymentsText(lang);
  const T = toolsText(lang);
  const P = plansText(lang);
  const [tab, setTab] = useState<"personal" | "team">("personal");
  const [sentPlan, setSentPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function requestPlan(plan: string) {
    setBusy(plan);
    // Pembayaran online aktif → langsung ke halaman bayar Midtrans (paket tim tetap daftar minat).
    if (payEnabled && plan !== "team") {
      if (!(await startCheckout("plan", plan, PAY.failed))) setBusy(null);
      return;
    }
    const res = await fetch("/api/tools/request", { method: "POST", body: JSON.stringify({ plan, note }) });
    setBusy(null);
    if (!res.ok) return toast.error(T.sendFailed);
    setSentPlan(plan);
  }

  return (
    <div className="space-y-5">
      {showTeam && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border bg-muted/50 p-1" role="tablist">
            {(["personal", "team"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  "rounded-full px-5 py-1.5 text-sm transition-colors",
                  tab === k ? "bg-background font-medium shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {k === "personal" ? P.personal : P.business}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "team" ? (
        <div className="mx-auto max-w-md rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-semibold">{P.team.name}</p>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{P.team.badge}</span>
          </div>
          <p className="mt-3 text-xl font-bold">{P.team.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{P.team.desc}</p>
          <div className="mt-5">
            {sentPlan === "team" ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> {P.team.sent}
              </p>
            ) : (
              <Button className="w-full rounded-full" disabled={busy !== null} onClick={() => requestPlan("team")}>
                {busy === "team" && <Loader2 className="animate-spin" />} {P.team.cta}
              </Button>
            )}
          </div>
          <FeatureList features={P.team.features} />
          <p className="mt-5 text-xs text-muted-foreground">{P.team.note}</p>
        </div>
      ) : (
        <div className={cn("grid gap-3", plans.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3")}>
          {plans.map((p) => {
            const d: PlanDetail | undefined = P.plans[p.id];
            const current = p.id === currentPlan;
            const best = p.id === RECOMMENDED_PLAN;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-card p-5",
                  best && "border-primary/50 bg-gradient-to-b from-primary/10 to-card ring-1 ring-primary/30",
                )}
              >
                <div className="flex min-h-6 items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-1.5 text-lg font-semibold">
                    {p.name}
                    {p.originalPrice !== undefined && (
                      <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-white">{p.promoLabel ?? T.promo}</span>
                    )}
                  </p>
                  {best && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      <Crown className="size-3" /> {T.bestFit}
                    </span>
                  )}
                </div>
                {d && (
                  <>
                    <p className="mt-3 text-xl font-bold leading-tight xl:min-h-[3.1rem]">{d.headline}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground xl:min-h-[3.75rem]">{d.desc}</p>
                  </>
                )}

                <div className="mt-4">
                  {current ? (
                    <p className="rounded-full border py-2 text-center text-sm text-muted-foreground">{T.currentPlan}</p>
                  ) : !p.price ? (
                    <p className="rounded-full border py-2 text-center text-sm text-muted-foreground">{P.getFree}</p>
                  ) : sentPlan === p.id ? (
                    <p className="flex min-h-9 items-center justify-center gap-1.5 text-center text-sm text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-4 shrink-0" /> {T.sentContact}
                    </p>
                  ) : (
                    <Button
                      variant={best ? "default" : "outline"}
                      className="w-full rounded-full"
                      disabled={busy !== null}
                      onClick={() => requestPlan(p.id)}
                    >
                      {busy === p.id ? <Loader2 className="animate-spin" /> : <Sparkles />} {T.choosePlan(p.name)}
                    </Button>
                  )}
                </div>

                {p.originalPrice !== undefined && (
                  <p className="mt-5 text-sm text-muted-foreground">
                    <span className="line-through">Rp{p.originalPrice.toLocaleString("id-ID")}</span>
                    <span className="ml-1.5 font-medium text-destructive">{T.save(Math.round((1 - p.price / p.originalPrice) * 100))}</span>
                  </p>
                )}
                <p className={cn("flex items-baseline gap-1.5", p.originalPrice === undefined && "mt-5")}>
                  {p.price > 0 && <span className="text-sm text-muted-foreground">Rp</span>}
                  <span className="text-3xl font-bold tracking-tight">{p.price ? p.price.toLocaleString("id-ID") : T.free}</span>
                  {p.price > 0 && <span className="text-sm text-muted-foreground">{P.monthly}</span>}
                </p>
{p.promoUntil && (
                  <p className="text-xs text-muted-foreground">
                    {T.promoUntil(
                      new Date(p.promoUntil).toLocaleDateString(T.numberLocale, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }),
                    )}
                  </p>
                )}
                {d && <p className="mt-1 text-sm font-medium text-primary">{d.quota}</p>}

                {d && <FeatureList features={d.features} includes={d.includes} />}
                {d?.footnote && <p className="mt-auto pt-5 text-xs text-muted-foreground">{d.footnote}</p>}
              </div>
            );
          })}
        </div>
      )}
      {showTeam && tab === "personal" && <p className="text-center text-xs text-muted-foreground">{P.footer}</p>}
    </div>
  );
}

function FeatureList({ features, includes }: { features: PlanDetail["features"]; includes?: string }) {
  return (
    <div className="mt-5 border-t pt-4">
      {includes && <p className="mb-2.5 text-sm font-medium">{includes}</p>}
      <ul className="space-y-2.5 text-sm">
        {features.map((f) => {
          const Icon = ICONS[f.icon];
          return (
            <li key={f.text} className="flex gap-2.5">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{f.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
