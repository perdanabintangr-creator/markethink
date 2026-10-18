import { describe, expect, it } from "vitest";
import { activePromo, toPlanOffer } from "@/lib/plan-offers";

const row = { id: "pro", name: "Pro", monthly_price_idr: 200000, monthly_credits: 900 };
const DAY = 86_400_000;

describe("harga promo paket", () => {
  it("tanpa promo: harga normal, tidak ada harga coret", () => {
    const o = toPlanOffer(row);
    expect(o.price).toBe(200000);
    expect(o.originalPrice).toBeUndefined();
  });

  it("promo aktif: harga promo dipakai, harga normal dicoret", () => {
    const o = toPlanOffer({ ...row, promo_price_idr: 149000, promo_label: " Promo 11.11 ", promo_until: new Date(Date.now() + DAY).toISOString() });
    expect(o.price).toBe(149000);
    expect(o.originalPrice).toBe(200000);
    expect(o.promoLabel).toBe("Promo 11.11");
    expect(o.promoUntil).toBeTruthy();
  });

  it("promo tidak berlaku bila lewat tanggal, tidak lebih murah, atau 0", () => {
    expect(activePromo({ ...row, promo_price_idr: 149000, promo_until: new Date(Date.now() - 1000).toISOString() })).toBeNull();
    expect(activePromo({ ...row, promo_price_idr: 250000 })).toBeNull();
    expect(activePromo({ ...row, promo_price_idr: 200000 })).toBeNull();
    expect(activePromo({ ...row, promo_price_idr: 0 })).toBeNull();
    expect(activePromo({ ...row, promo_price_idr: null })).toBeNull();
    expect(activePromo({ ...row, promo_price_idr: "149000" })).toBe(149000);
  });
});
