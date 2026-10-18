"use client";

import { Suspense } from "react";
import Link from "next/link";
import { BadgePercent, CheckCircle2, Package, Sparkles } from "lucide-react";
import type { AddonOffer, BundleOffer } from "@/lib/addons/format";
import { useApp } from "@/components/app/app-context";
import { addonsStoreText } from "@/lib/i18n/addons-store";
import { RequestAddonButton } from "./request-addon";
import { PaymentReturn } from "./payment-return";

const fmt = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export interface StoreAddon {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  tools: string[];
  offer: AddonOffer;
  active: { remaining: number; until: string } | null;
}

/** Toko Add-on Smart Tools: bundel hemat di atas, eceran per kelompok tool di bawah. Harga member sudah termasuk diskon 15%. */
export function AddonStore({ addons, bundles, member, isAdmin }: { addons: StoreAddon[]; bundles: BundleOffer[]; member: boolean; isAdmin: boolean }) {
  const S = addonsStoreText(useApp().lang);
  const byId = Object.fromEntries(addons.map((a) => [a.id, a]));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{S.title}</h1>
          <p className="mt-1 text-muted-foreground">{S.desc}</p>
          {!isAdmin &&
            (member ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-700 dark:text-emerald-400">
                <BadgePercent className="size-4" /> {S.memberNote}
              </p>
            ) : (
              <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm">
                <BadgePercent className="size-4 text-primary" /> {S.upsellNote}
                <Link href="/pricing" className="font-medium text-primary hover:underline">
                  {S.seePlans}
                </Link>
              </p>
            ))}
        </div>

        <Suspense>
          <PaymentReturn />
        </Suspense>

        {bundles.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold">{S.bundles}</h2>
            <p className="text-sm text-muted-foreground">{S.bundlesDesc}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {bundles.map((b) => {
                const save = Math.round((1 - b.price / b.retailPrice) * 100);
                return (
                  <div key={b.id} className="flex flex-col rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/10 to-card p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-lg font-semibold">
                        <Package className="size-5 text-primary" /> {b.name}
                      </p>
                      {save > 0 && <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-white">{S.save(save)}</span>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{b.tagline}</p>
                    <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{S.includes}</p>
                    <ul className="mt-1.5 space-y-1 text-sm">
                      {b.addons.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <span>
                            {byId[a.id]?.emoji} {byId[a.id]?.name ?? a.id}
                          </span>
                          <span className="text-xs text-muted-foreground">{S.uses(a.quota)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
                      <Price price={b.price} original={b.retailPrice} member={b.memberDiscount} perMonth={S.perMonth} memberLabel={S.member} />
                      <RequestAddonButton
                        bundle={b.id}
                        name={b.name}
                        price={b.price}
                        originalPrice={b.retailPrice}
                        quota={0}
                        summary={S.bundleSummary(fmt(b.price), b.addons.length)}
                        label={S.buyBundle}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold">{S.retail}</h2>
          <p className="text-sm text-muted-foreground">{S.retailDesc}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {addons.map((a) => (
              <div key={a.id} className="flex flex-col rounded-2xl border bg-card p-4">
                <p className="font-semibold">
                  <span aria-hidden>{a.emoji}</span> {a.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{a.tagline}</p>
                {!!a.tools.length && <p className="mt-2 text-xs text-muted-foreground">{a.tools.join(" · ")}</p>}
                <p className="mt-2 text-sm font-medium text-primary">{S.uses(a.offer.quota)}</p>
                {a.active && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> {S.active(a.active.remaining, a.active.until)}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                  <Price price={a.offer.price} original={a.offer.originalPrice} member={a.offer.memberDiscount} perMonth={S.perMonth} memberLabel={S.member} />
                  <RequestAddonButton
                    addon={a.id}
                    name={a.name}
                    price={a.offer.price}
                    originalPrice={a.offer.originalPrice}
                    quota={a.offer.quota}
                    label={a.active ? S.extend : S.buy}
                    variant="outline"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-muted/30 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-primary" /> {S.howTitle}
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {S.how.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Price({ price, original, member, perMonth, memberLabel }: { price: number; original?: number; member?: boolean; perMonth: string; memberLabel: string }) {
  return (
    <div>
      {original !== undefined && original > price && <p className="text-sm text-muted-foreground line-through">{fmt(original)}</p>}
      <p>
        <span className="text-2xl font-bold">{fmt(price)}</span> <span className="text-sm text-muted-foreground">{perMonth}</span>
      </p>
      {member && <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{memberLabel}</p>}
    </div>
  );
}
