"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, Images, Loader2, Package, Send, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { startCheckout, warmPaymentPages } from "@/components/tools/checkout";

/** Bentuk data yang sama dengan content-offers.ts (dikirim dari server). */
export interface ContentOfferView {
  id: string;
  name: string;
  tagline: string | null;
  price: number;
  originalPrice?: number;
  promoLabel?: string;
  postsPerWeek: number;
  postsPerMonth: number;
  innerVisuals: number;
}
export interface ComboOfferView {
  id: string;
  name: string;
  price: number;
  listTotal: number;
  planName: string;
  contentName: string;
}
export interface CurrentContentPlan {
  planId: string;
  name: string;
  periodEnd: string | null;
}

const RECOMMENDED = "konten_pro";
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const short = (n: number) => (n % 1000 === 0 ? `Rp${(n / 1000).toLocaleString("id-ID")}rb` : rp(n));

const T = {
  id: {
    title: "Paket Autopilot Konten",
    sub: "Autopilot + Kalender Konten, terpisah dari paket chat. Bisa dibeli semua paket, termasuk Free. Aktif 30 hari, tanpa potong otomatis.",
    per: "/30 hari",
    buy: "Pilih paket",
    renew: "Perpanjang 30 hari",
    switch: "Ganti ke paket ini",
    active: "Paket aktif",
    until: (d: string) => `aktif s.d. ${d}`,
    recommended: "Paling pas",
    perWeek: (w: number, m: number) => `${w} konten/minggu (${m} per 30 hari)`,
    visuals: (n: number) => `Carousel bergambar AI: cover + ${n} visual baru per carousel`,
    dna: "Brand DNA + riset brand otomatis",
    ig: "Terbit otomatis ke Instagram",
    calendar: "Kalender Konten",
    team: "Tim AI: strategist, copywriter, pemeriksa, Visual Director",
    comboTitle: "Hemat dengan bundel",
    comboSave: (n: string) => `hemat ${n}`,
    comboDesc: (plan: string, content: string) => `Paket ${plan} (chat, Smart Tools, Agent) + ${content} dalam satu pembayaran.`,
    comboBuy: "Ambil bundel",
    failed: "Gagal membuka pembayaran. Coba lagi.",
  },
  en: {
    title: "Content Autopilot plans",
    sub: "Autopilot + Content Calendar, separate from chat plans. Anyone can buy, including Free. Active for 30 days, no auto-charge.",
    per: "/30 days",
    buy: "Choose plan",
    renew: "Extend 30 days",
    switch: "Switch to this plan",
    active: "Active plan",
    until: (d: string) => `active until ${d}`,
    recommended: "Best fit",
    perWeek: (w: number, m: number) => `${w} posts/week (${m} per 30 days)`,
    visuals: (n: number) => `AI-illustrated carousels: cover + ${n} new visuals each`,
    dna: "Brand DNA + automatic brand research",
    ig: "Auto-publish to Instagram",
    calendar: "Content Calendar",
    team: "AI team: strategist, copywriter, reviewer, Visual Director",
    comboTitle: "Save with a bundle",
    comboSave: (n: string) => `save ${n}`,
    comboDesc: (plan: string, content: string) => `${plan} plan (chat, Smart Tools, Agent) + ${content} in one payment.`,
    comboBuy: "Get the bundle",
    failed: "Couldn't open the payment page. Please try again.",
  },
};

export function ContentPackages({
  lang,
  plans,
  combos,
  current,
  heading = true,
  dark = false,
  signupHref,
}: {
  lang: "id" | "en";
  plans: ContentOfferView[];
  combos: ComboOfferView[];
  current: CurrentContentPlan | null;
  heading?: boolean;
  dark?: boolean;
  /** Halaman publik (belum login): tombol mengarah ke daftar, bukan pembayaran. */
  signupHref?: string;
}) {
  const t = T[lang];
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => warmPaymentPages(), []);
  const until = current?.periodEnd ? new Date(current.periodEnd).toLocaleDateString(lang === "en" ? "en-GB" : "id-ID", { day: "numeric", month: "short", year: "numeric" }) : null;

  async function buy(kind: "content" | "combo", id: string) {
    setBusy(id);
    const ok = await startCheckout(kind, id, t.failed);
    if (!ok) setBusy(null);
  }

  return (
    <section className="space-y-5" id="paket-konten">
      {heading && (
        <div className="text-center">
          <h2 className={cn("text-xl font-bold sm:text-2xl", dark && "text-white")}>{t.title}</h2>
          <p className={cn("mx-auto mt-1 max-w-2xl text-sm", dark ? "text-white/70" : "text-muted-foreground")}>{t.sub}</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = current?.planId === p.id;
          const rec = p.id === RECOMMENDED;
          return (
            <div
              key={p.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-5 text-card-foreground shadow-sm",
                rec && "border-primary ring-2 ring-primary/30",
                isCurrent && "border-emerald-500 ring-2 ring-emerald-500/30",
              )}
            >
              {(rec || isCurrent) && (
                <span className={cn("absolute -top-3 left-5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white", isCurrent ? "bg-emerald-600" : "bg-primary")}>
                  {isCurrent ? t.active : t.recommended}
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {p.tagline && <p className="mt-0.5 min-h-10 text-sm text-muted-foreground">{p.tagline}</p>}
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">{short(p.price)}</span>
                <span className="text-sm text-muted-foreground">{t.per}</span>
              </div>
              {p.originalPrice && (
                <p className="text-xs text-muted-foreground">
                  <s>{short(p.originalPrice)}</s> {p.promoLabel && <span className="font-medium text-primary">{p.promoLabel}</span>}
                </p>
              )}
              {isCurrent && until && <p className="mt-1 text-xs font-medium text-emerald-600">{t.until(until)}</p>}
              {signupHref ? (
                <Button asChild className="mt-4 w-full" variant={rec ? "default" : "outline"}>
                  <Link href={signupHref}>{t.buy}</Link>
                </Button>
              ) : (
                <Button className="mt-4 w-full" variant={rec || isCurrent ? "default" : "outline"} disabled={busy !== null} onClick={() => buy("content", p.id)}>
                  {busy === p.id && <Loader2 className="size-4 animate-spin" />}
                  {isCurrent ? t.renew : current ? t.switch : t.buy}
                </Button>
              )}
              <ul className="mt-5 space-y-2.5 text-sm">
                {[
                  { icon: Sparkles, text: t.perWeek(p.postsPerWeek, p.postsPerMonth) },
                  { icon: Images, text: t.visuals(p.innerVisuals) },
                  { icon: Wand2, text: t.dna },
                  { icon: Send, text: t.ig },
                  { icon: CalendarDays, text: t.calendar },
                  { icon: Check, text: t.team },
                ].map((f) => (
                  <li key={f.text} className="flex items-start gap-2">
                    <f.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {combos.map((c) => (
        <div key={c.id} className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-primary/50 bg-primary/5 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Package className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t.comboTitle}</p>
              <p className="font-semibold">
                {c.name} · {short(c.price)}
                {t.per}{" "}
                {c.listTotal > c.price && <span className="ml-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">{t.comboSave(short(c.listTotal - c.price))}</span>}
              </p>
              <p className="text-sm text-muted-foreground">
                {t.comboDesc(c.planName, c.contentName)} {c.listTotal > c.price && <s className="ml-1">{short(c.listTotal)}</s>}
              </p>
            </div>
          </div>
          {signupHref ? (
            <Button asChild className="shrink-0">
              <Link href={signupHref}>{t.comboBuy}</Link>
            </Button>
          ) : (
            <Button disabled={busy !== null} onClick={() => buy("combo", c.id)} className="shrink-0">
              {busy === c.id && <Loader2 className="size-4 animate-spin" />}
              {t.comboBuy}
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}
