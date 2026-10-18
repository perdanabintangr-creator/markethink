"use client";

import type { AddonOffer } from "@/lib/addons/format";
import { useApp } from "@/components/app/app-context";
import { toolsText } from "@/lib/i18n/tools";
import { RequestAddonButton } from "./request-addon";

const fmt = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

/** Kartu beli add-on satu kelompok Tools Pro (untuk paket yang belum membuka Tools Pro). Harga normal dicoret saat promo. */
export function AddonOfferCard({ offer, tools, compact }: { offer: AddonOffer & { name: string }; tools?: string[]; compact?: boolean }) {
  const T = toolsText(useApp().lang);
  const save = offer.originalPrice ? Math.round((1 - offer.price / offer.originalPrice) * 100) : 0;
  return (
    <div className={compact ? "flex flex-wrap items-center justify-between gap-3" : "flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5"}>
      <div className="min-w-0">
        {!compact && (
          <>
            <p className="flex flex-wrap items-center gap-1.5 font-semibold">
              {T.addonOnlyTitle(offer.name)}
              {offer.originalPrice !== undefined && (
                <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-white">{offer.promoLabel ?? T.promo}</span>
              )}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{T.addonOnlyDesc}</p>
            {!!tools?.length && (
              <p className="mt-1 text-xs text-muted-foreground">
                {T.addonIncludes}
                {tools.join(", ")}
              </p>
            )}
          </>
        )}
        <p className={compact ? "text-sm" : "mt-2"}>
          {offer.originalPrice !== undefined && (
            <span className="mr-1.5 text-sm text-muted-foreground">
              <span className="line-through">{fmt(offer.originalPrice)}</span>
              <span className="ml-1 font-medium text-destructive">{T.save(save)}</span>
            </span>
          )}
          <span className={compact ? "font-semibold" : "text-2xl font-bold"}>{fmt(offer.price)}</span>
          <span className="text-sm text-muted-foreground">{T.perMonth}</span>
          <span className="ml-2 text-sm font-medium text-primary">· {T.addonQuota(offer.quota)}</span>
          {compact && offer.originalPrice !== undefined && (
            <span className="ml-1.5 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-white">{offer.promoLabel ?? T.promo}</span>
          )}
        </p>
        {offer.promoUntil && (
          <p className="text-xs text-muted-foreground">
            {T.promoUntil(
              new Date(offer.promoUntil).toLocaleDateString(T.numberLocale, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }),
            )}
          </p>
        )}
      </div>
      <RequestAddonButton
        addon={offer.id}
        name={offer.name}
        price={offer.price}
        originalPrice={offer.originalPrice}
        quota={offer.quota}
        variant={compact ? "outline" : "default"}
      />
    </div>
  );
}
