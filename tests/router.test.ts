import { describe, expect, it, vi } from "vitest";
import { simulateReadableStream, streamText, tool } from "ai";
import { z } from "zod";
import { MockLanguageModelV2 } from "ai/test";

const failing = new MockLanguageModelV2({
  doStream: async () => {
    throw new Error("429 rate limited");
  },
});
const working = new MockLanguageModelV2({
  provider: "google.generative-ai",
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

  it("tool web search Claude dibuang saat jatuh ke model non-Claude", async () => {
    const { createFallbackModel } = await import("@/lib/ai/router");
    const { anthropic } = await import("@ai-sdk/anthropic");
    const routed = createFallbackModel([{ provider: "google", modelId: "b" }]);
    const result = streamText({
      model: routed.model,
      prompt: "hai",
      maxRetries: 0,
      tools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: 2 }) },
    });
    await result.consumeStream();
    expect(working.doStreamCalls.at(-1)?.tools).toBeUndefined();
  });

  it("tool buatan sendiri (gambar/PPT) tetap dikirim ke model non-Claude", async () => {
    const { createFallbackModel } = await import("@/lib/ai/router");
    const { anthropic } = await import("@ai-sdk/anthropic");
    const routed = createFallbackModel([{ provider: "google", modelId: "b" }]);
    const result = streamText({
      model: routed.model,
      prompt: "hai",
      maxRetries: 0,
      tools: {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 2 }),
        generate_image: tool({ description: "x", inputSchema: z.object({ prompt: z.string() }), execute: async () => "ok" }),
      },
    });
    await result.consumeStream();
    expect(working.doStreamCalls.at(-1)?.tools?.map((t) => t.name)).toEqual(["generate_image"]);
  });

  it("Google Search hanya dikirim ke Gemini, web search Claude dibuang", async () => {
    const { createFallbackModel } = await import("@/lib/ai/router");
    const { anthropic } = await import("@ai-sdk/anthropic");
    const routed = createFallbackModel([{ provider: "google", modelId: "b" }]);
    const result = streamText({
      model: routed.model,
      prompt: "hai",
      maxRetries: 0,
      tools: {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 2 }),
        google_search: { type: "provider-defined", id: "google.google_search", name: "google_search", args: {}, inputSchema: z.object({}) },
      },
    });
    await result.consumeStream();
    expect(working.doStreamCalls.at(-1)?.tools?.map((t) => t.name)).toEqual(["google_search"]);
  });

  it("tanpa kandidat → error jelas", async () => {
    const { createFallbackModel } = await import("@/lib/ai/router");
    expect(() => createFallbackModel([])).toThrow(/provider LLM/);
  });
});

describe("lampiran file ke model", () => {
  it("PDF/gambar dalam data URL dikirim langsung ke model, tidak 'diunduh'", async () => {
    const { createFallbackModel } = await import("@/lib/ai/router");
    const routed = createFallbackModel([{ provider: "google", modelId: "b" }]);
    const pdf = `data:application/pdf;base64,${Buffer.from("%PDF-1.4 tes").toString("base64")}`;
    let err: unknown;
    const result = streamText({
      model: routed.model,
      maxRetries: 0,
      onError: ({ error }) => void (err = error),
      messages: [
        {
          role: "user",
          content: [
            { type: "file", data: pdf, mediaType: "application/pdf", filename: "a.pdf" },
            { type: "text", text: "baca" },
          ],
        },
      ],
    });
    await result.consumeStream();
    expect(err).toBeUndefined();
    const sent = working.doStreamCalls.at(-1)?.prompt.at(-1)?.content as { type: string }[];
    expect(sent.some((p) => p.type === "file")).toBe(true);
    // Router harus menyatakan data URL didukung; kalau tidak, AI SDK mencoba mengunduhnya lewat undici
    // (tidak ada di bundle production) dan gagal "Failed to download data:application/pdf…".
    const supported = routed.model.supportedUrls as Record<string, RegExp[]>;
    expect(supported["*/*"].some((r) => r.test(pdf))).toBe(true);
  });
});
