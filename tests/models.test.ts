import { describe, expect, it } from "vitest";
import { getTier, getTiers, messageCreditCost, estimateCostUsd } from "@/lib/ai/models.config";

describe("models.config", () => {
  it("urutan tier Junior → Senior → Associate", () => {
    expect(getTiers({}).map((t) => t.id)).toEqual(["junior", "senior", "associate", "director"]);
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
    expect(getTiers({ MODEL_SENIOR: "unknown:model" })[1].candidates[0]).toEqual({ provider: "anthropic", modelId: "claude-sonnet-5-5" });
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

describe("Claude sebagai otak utama", () => {
  it("tiap tier diawali Claude dengan Gemini sebagai cadangan", () => {
    const ids = getTiers({}).map((t) => t.candidates[0].modelId);
    expect(ids).toEqual(["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-1"]);
    for (const t of getTiers({})) expect(t.candidates.some((c) => c.provider === "google")).toBe(true);
  });
});

describe("urutan model gambar", () => {
  it("Gemini Flash Image diutamakan, versi Pro (mahal) belakangan", async () => {
    const { imageModelScore } = await import("@/lib/ai/image");
    const ids = ["openai/gpt-5-image", "google/gemini-3-pro-image-preview", "google/gemini-2.5-flash-image", "google/gemini-3.1-flash-image"];
    expect([...ids].sort((a, b) => imageModelScore(b) - imageModelScore(a))).toEqual([
      "google/gemini-3.1-flash-image",
      "google/gemini-2.5-flash-image",
      "google/gemini-3-pro-image-preview",
      "openai/gpt-5-image",
    ]);
  });
});

describe("pembersih API key", () => {
  it("membuang spasi, kutip, dan nama variabel yang ikut tertempel", async () => {
    const { cleanKey } = await import("@/lib/ai/image");
    expect(cleanKey("  sk-or-v1-abc\n")).toBe("sk-or-v1-abc");
    expect(cleanKey('"sk-or-v1-abc"')).toBe("sk-or-v1-abc");
    expect(cleanKey("OPENROUTER_API_KEY=sk-or-v1-abc")).toBe("sk-or-v1-abc");
    expect(cleanKey("Bearer sk-or-v1-abc")).toBe("sk-or-v1-abc");
    expect(cleanKey("  ")).toBeUndefined();
  });
});
