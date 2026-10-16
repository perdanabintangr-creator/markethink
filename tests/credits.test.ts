import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
const { creditsForUsd, IDR_PER_CREDIT, IDR_PER_USD } = await import("@/lib/credits");
const { TOOL_CREDIT_ESTIMATE, revisionEstimate, creditText } = await import("@/lib/addons/format");
const { PLAN_FEATURES, toPlanOffer } = await import("@/lib/plan-offers");

describe("Kredit bulanan (1 kredit ≈ Rp100 modal AI)", () => {
  it("USD → kredit dibulatkan ke atas, minimal 1", () => {
    expect(IDR_PER_CREDIT).toBe(100);
    expect(creditsForUsd(0)).toBe(1);
    expect(creditsForUsd(-1)).toBe(1);
    expect(creditsForUsd(100 / IDR_PER_USD)).toBe(1);
    expect(creditsForUsd(1)).toBe(Math.ceil(IDR_PER_USD / 100));
  });

  it("margin ≥50% bila kredit paket habis terpakai", () => {
    const plans = { starter: [60_000, 250], pro: [200_000, 900], promax: [300_000, 1350] } as const;
    for (const [id, [price, credits]] of Object.entries(plans)) expect(credits * IDR_PER_CREDIT, id).toBeLessThanOrEqual(price * 0.5);
  });

  it("perkiraan Tools Pro: otak lebih pintar lebih mahal, revisi lebih hemat", () => {
    expect(TOOL_CREDIT_ESTIMATE.senior).toBeLessThan(TOOL_CREDIT_ESTIMATE.associate);
    expect(TOOL_CREDIT_ESTIMATE.associate).toBeLessThan(TOOL_CREDIT_ESTIMATE.director);
    expect(revisionEstimate("senior")).toBe(30);
  });

  it("teks status kredit", () => {
    const base = { allowed: true, agent: false, isAdmin: false, isFree: false, planId: "starter", remaining: 1234, monthLimit: 250 };
    expect(creditText(base)).toContain("1.234");
    expect(creditText({ ...base, isAdmin: true })).toContain("tanpa batas");
    expect(creditText({ ...base, allowed: false, isFree: true })).toContain("Free");
  });

  it("penawaran paket dari baris DB", () => {
    expect(toPlanOffer({ id: "pro", name: "Pro", monthly_price_idr: "200000", monthly_credits: 900 })).toEqual({ id: "pro", name: "Pro", price: 200000, credits: 900 });
    for (const id of ["beta", "starter", "pro", "promax"]) expect(PLAN_FEATURES[id]?.length).toBeGreaterThan(0);
  });
});
