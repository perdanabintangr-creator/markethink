import { describe, expect, it } from "vitest";
import { ADDON_COST_SHARE, addonWindowStart, computeAddonQuota } from "@/lib/addons/addon-quota";
import { promoPrice } from "@/lib/plan-offers";

const DAY = 86_400_000;
const now = new Date("2026-11-20T05:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const sub = { period_start: "2026-11-10T00:00:00Z", period_end: "2026-12-10T00:00:00Z", amount_idr: 50_000, months: 1 };
const run = (cost_idr: number, extra: Partial<{ status: string; revision_of: string | null; created_at: string }> = {}) => ({
  created_at: iso(now.getTime() - DAY),
  status: "ok",
  revision_of: null,
  cost_idr,
  ...extra,
});

describe("kuota add-on", () => {
  it("tanpa pembelian aktif: terkunci", () => {
    const q = computeAddonQuota({ addonId: "konten_pro", quota: 15, listPrice: 50_000, current: null, paidUntil: null, runs: [] }, now);
    expect(q.active).toBe(false);
    expect(q.remaining).toBe(0);
  });

  it("batas modal = 70% uang yang dibayar per bulan → laba minimal 30%", () => {
    const q = computeAddonQuota({ addonId: "konten_pro", quota: 15, listPrice: 50_000, current: sub, paidUntil: sub.period_end, runs: [] }, now);
    expect(q.budgetIdr).toBe(50_000 * ADDON_COST_SHARE);
    // 35.000 / 5.000 = 7 hasil (lebih kecil dari kuota 15)
    expect(q.remaining).toBe(7);
  });

  it("harga promo / beli beberapa bulan: modal ikut uang per bulan", () => {
    const q = computeAddonQuota(
      { addonId: "konten_pro", quota: 15, listPrice: 50_000, current: { ...sub, amount_idr: 90_000, months: 3 }, paidUntil: sub.period_end, runs: [] },
      now,
    );
    expect(q.budgetIdr).toBe(21_000);
  });

  it("hasil & biaya nyata mengurangi sisa; error tidak dihitung; revisi hanya memakai modal", () => {
    const q = computeAddonQuota(
      {
        addonId: "konten_pro",
        quota: 4,
        listPrice: 50_000,
        current: sub,
        paidUntil: sub.period_end,
        runs: [run(3000), run(3000), run(9000, { status: "error" }), run(2000, { revision_of: "x" })],
      },
      now,
    );
    expect(q.usedRuns).toBe(2);
    expect(q.usedIdr).toBe(8000);
    expect(q.remaining).toBe(2); // kuota 4 − 2 = 2; modal sisa 27.000 → 5
  });

  it("modal habis duluan → tidak bisa membuat hasil walau kuota hasil masih ada", () => {
    const q = computeAddonQuota(
      { addonId: "riset_pro", quota: 6, listPrice: 50_000, current: sub, paidUntil: sub.period_end, runs: [run(18_000), run(12_000)] },
      now,
    );
    expect(q.remaining).toBe(0);
    expect(q.canRevise).toBe(false);
  });

  it("kuota terisi lagi tiap bulan sejak tanggal mulai", () => {
    expect(addonWindowStart("2026-10-10T00:00:00Z", now).toISOString()).toBe("2026-11-10T00:00:00.000Z");
    const old = run(30_000, { created_at: "2026-11-05T00:00:00Z" });
    const q = computeAddonQuota(
      { addonId: "konten_pro", quota: 15, listPrice: 50_000, current: { ...sub, period_start: "2026-10-10T00:00:00Z" }, paidUntil: sub.period_end, runs: [old] },
      now,
    );
    expect(q.usedIdr).toBe(0);
  });

  it("harga coret add-on memakai aturan promo yang sama", () => {
    expect(promoPrice(50_000, 35_000, null)).toBe(35_000);
    expect(promoPrice(50_000, 60_000, null)).toBeNull();
  });
});
