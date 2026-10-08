import { describe, expect, it } from "vitest";
import { getTier, getTiers, messageCreditCost, estimateCostUsd } from "@/lib/ai/models.config";

describe("models.config", () => {
  it("urutan tier Junior → Senior → Associate", () => {
    expect(getTiers({}).map((t) => t.id)).toEqual(["junior", "senior", "associate"]);
  });

  it("tier lebih tinggi lebih mahal", () => {
    const [j, s, a] = getTiers({});
    expect(j.creditCost).toBeLessThan(s.creditCost);
    expect(s.creditCost).toBeLessThan(a.creditCost);
  });

  it("setiap tier punya fallback", () => {
    for (const t of getTiers({})) expect(t.candidates.length).toBeGreaterThan(1);
  });

  it("override model lewat env", () => {
    const tiers = getTiers({ MODEL_JUNIOR: "openrouter:foo/bar:free, google:gemini-x" });
    expect(tiers[0].candidates).toEqual([
      { provider: "openrouter", modelId: "foo/bar:free" },
      { provider: "google", modelId: "gemini-x" },
    ]);
  });

  it("env tidak valid → pakai default", () => {
    expect(getTiers({ MODEL_SENIOR: "unknown:model" })[1].candidates[0].provider).toBe("google");
  });

  it("tier tidak dikenal → senior", () => {
    expect(getTier("xxx").id).toBe("senior");
  });

  it("biaya kredit menambah riset & lampiran", () => {
    const s = getTier("senior");
    expect(messageCreditCost(s, { research: false, attachments: 0 })).toBe(2);
    expect(messageCreditCost(s, { research: true, attachments: 2 })).toBe(6);
  });

  it("model :free biayanya nol", () => {
    expect(estimateCostUsd({ provider: "openrouter", modelId: "x:free" }, 1000, 1000)).toBe(0);
    expect(estimateCostUsd({ provider: "google", modelId: "gemini-2.5-flash" }, 1_000_000, 0)).toBeCloseTo(0.3);
  });
});
