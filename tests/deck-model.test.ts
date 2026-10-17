import { expect, it, vi } from "vitest";

vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
const { routeTier } = await import("@/lib/ai/router");

it("PPT di otak Director ditulis Opus (bukan Fable); chat biasa tetap Fable", () => {
  expect(routeTier("director", { deck: true }).candidates[0].modelId).toBe("claude-opus-5-5");
  expect(routeTier("director").candidates[0].modelId).toBe("claude-fable-5-1");
  expect(routeTier("senior", { deck: true }).candidates[0].modelId).toBe("claude-sonnet-5-5");
});
