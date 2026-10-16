import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { addCost, addStepCost } = await import("@/lib/addons/runtime");

describe("rincian biaya per tahap", () => {
  it("mencatat tiap tahap: token, perkiraan tulisan terlihat, biaya", () => {
    const ctx = { admin: {} as never, userId: "u", runId: "r", cost: { usd: 0, model: null as string | null } };
    addCost(ctx, { provider: "anthropic", modelId: "claude-opus-5-5" }, { inputTokens: 10_000, outputTokens: 20_000 }, { stage: "Menyusun laporan", text: "x".repeat(3200) });
    addStepCost(ctx, "Pencarian Google (Serper 6×)", 0.006);
    const steps = (ctx as { breakdown?: { stage: string; text_tokens: number; usd: number }[] }).breakdown!;
    expect(steps.map((s) => s.stage)).toEqual(["Menyusun laporan", "Pencarian Google (Serper 6×)"]);
    expect(steps[0].text_tokens).toBe(1000);
    expect(steps[0].usd).toBeCloseTo(10_000 * 4e-6 + 20_000 * 20e-6, 6);
    expect(ctx.cost.usd).toBeCloseTo(steps[0].usd + 0.006, 6);
  });
});
