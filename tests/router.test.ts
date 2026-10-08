import { describe, expect, it, vi } from "vitest";
import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV2 } from "ai/test";

const failing = new MockLanguageModelV2({
  doStream: async () => {
    throw new Error("429 rate limited");
  },
});
const working = new MockLanguageModelV2({
  doStream: async () => ({
    stream: simulateReadableStream({
      chunks: [
        { type: "text-start", id: "t" },
        { type: "text-delta", id: "t", delta: "Halo " },
        { type: "text-delta", id: "t", delta: "marketer" },
        { type: "text-end", id: "t" },
        { type: "finish", finishReason: "stop", usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 } },
      ],
    }),
  }),
});

vi.mock("@ai-sdk/groq", () => ({ createGroq: () => () => failing }));
vi.mock("@ai-sdk/google", () => ({ createGoogleGenerativeAI: () => () => working }));
vi.mock("@openrouter/ai-sdk-provider", () => ({ createOpenRouter: () => ({ chat: () => working }) }));

describe("model router fallback", () => {
  it("pindah ke kandidat berikutnya saat provider pertama error", async () => {
    const { createFallbackModel } = await import("@/lib/ai/router");
    const routed = createFallbackModel([
      { provider: "groq", modelId: "a" },
      { provider: "google", modelId: "b" },
    ]);
    const result = streamText({ model: routed.model, prompt: "hai", maxRetries: 0 });
    expect(await result.text).toBe("Halo marketer");
    expect(routed.resolved()).toEqual({ provider: "google", modelId: "b" });
  });

  it("melempar error jika semua kandidat gagal", async () => {
    const { createFallbackModel } = await import("@/lib/ai/router");
    const routed = createFallbackModel([{ provider: "groq", modelId: "a" }]);
    let err: unknown;
    const result = streamText({ model: routed.model, prompt: "hai", maxRetries: 0, onError: ({ error }) => void (err = error) });
    await result.consumeStream();
    expect(String(err)).toMatch(/Semua model gagal: groq:a → .*429/);
  });

  it("tanpa kandidat → error jelas", async () => {
    const { createFallbackModel } = await import("@/lib/ai/router");
    expect(() => createFallbackModel([])).toThrow(/provider LLM/);
  });
});
