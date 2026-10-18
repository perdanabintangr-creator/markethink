import { describe, expect, it } from "vitest";
import { accountRisks, guaranteedMargin, maxSafeCredits, pnlStatus, type PnlAccount } from "@/lib/profit";

const base: PnlAccount = {
  plan_id: "pro",
  internal: false,
  revenue: 200_000,
  cost: 50_000,
  month_limit: 900,
  plan_credits: 900,
  plan_price_idr: 200_000,
  credit_override: null,
  bonus_credits: 0,
  active_until: new Date(Date.now() + 10 * 86_400_000).toISOString(),
};

describe("laba rugi per akun", () => {
  it("status dari pendapatan vs biaya", () => {
    expect(pnlStatus(0, 0)).toBe("idle");
    expect(pnlStatus(0, 500)).toBe("loss");
    expect(pnlStatus(100_000, 120_000)).toBe("loss");
    expect(pnlStatus(100_000, 80_000)).toBe("thin");
    expect(pnlStatus(100_000, 50_000)).toBe("profit");
    expect(pnlStatus(100_000, 10_000)).toBe("great");
  });

  it("batas aman kredit & margin terjamin paket", () => {
    expect(maxSafeCredits(200_000)).toBe(1400);
    expect(guaranteedMargin(200_000, 900)).toBeCloseTo(0.55);
    expect(guaranteedMargin(0, 50)).toBeNull();
  });

  it("akun sehat tanpa risiko; internal diabaikan", () => {
    expect(accountRisks(base)).toEqual([]);
    expect(accountRisks({ ...base, internal: true, active_until: null })).toEqual([]);
  });

  it("deteksi kebocoran", () => {
    const keys = (a: Partial<PnlAccount>) => accountRisks({ ...base, ...a }).map((r) => r.key);
    expect(keys({ active_until: null })).toContain("unpaid_plan");
    expect(keys({ credit_override: 5000 })).toContain("big_override");
    expect(keys({ plan_id: "beta", plan_price_idr: 0, plan_credits: 50, credit_override: 200, revenue: 0 })).toContain("big_override");
    expect(keys({ bonus_credits: 100 })).toContain("bonus");
    expect(keys({ cost: 250_000 })).toContain("loss");
  });
});

describe("harga promo (back office)", async () => {
  const { activePromo, effectivePrice, endOfDayWIB, dateInputWIB } = await import("@/lib/promo");
  const row = { monthly_price_idr: 200000 };
  it("harga efektif ikut promo yang aktif", () => {
    expect(effectivePrice(row)).toBe(200000);
    expect(effectivePrice({ ...row, promo_price_idr: 149000 })).toBe(149000);
    expect(activePromo({ ...row, promo_price_idr: 149000, promo_until: new Date(Date.now() - 1000).toISOString() })).toBeNull();
  });
  it("tanggal akhir promo = akhir hari WIB", () => {
    const iso = endOfDayWIB("2026-11-11");
    expect(iso).toBe("2026-11-11T16:59:59.000Z");
    expect(dateInputWIB(iso)).toBe("2026-11-11");
  });
});
