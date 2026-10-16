import { expect, it } from "vitest";
import { createUIMessageStream, readUIMessageStream, streamText, simulateReadableStream } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import type { LanguageModelV2StreamPart } from "@ai-sdk/provider";

// Pola Stop di /api/chat: abort dari server → onAbort terpanggil, stream UI tetap selesai & onFinish (simpan pesan) berjalan.
it("Stop menghentikan AI, jawaban sebagian tetap tersimpan", async () => {
  const model = new MockLanguageModelV2({
    doStream: async ({ abortSignal }) => ({
      stream: simulateReadableStream<LanguageModelV2StreamPart>({
        chunkDelayInMs: 30,
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "t" },
          ...Array.from({ length: 50 }, (_, i) => ({ type: "text-delta" as const, id: "t", delta: `kata${i} ` })),
          { type: "text-end", id: "t" },
          { type: "finish", finishReason: "stop", usage: { inputTokens: 1, outputTokens: 50, totalTokens: 51 } },
        ],
      }).pipeThrough(new TransformStream<LanguageModelV2StreamPart, LanguageModelV2StreamPart>({ transform: (c, ctl) => (abortSignal?.aborted ? ctl.terminate() : ctl.enqueue(c)) })),
    }),
  });
  const ctrl = new AbortController();
  let aborted = false;
  let saved: unknown[] | null = null;
  const stream = createUIMessageStream({
    originalMessages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "hai" }] }],
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: "resp-1" });
      const r = streamText({ model, prompt: "hai", abortSignal: ctrl.signal, onAbort: () => void (aborted = true) });
      writer.merge(r.toUIMessageStream({ sendStart: false }));
    },
    onFinish: ({ messages }) => void (saved = messages),
  });
  setTimeout(() => ctrl.abort(), 200);
  let last;
  for await (const m of readUIMessageStream({ stream })) last = m;
  await new Promise((r) => setTimeout(r, 50));
  expect(aborted).toBe(true);
  expect(saved).not.toBeNull();
  const text = (last?.parts ?? []).map((p) => ("text" in p ? p.text : "")).join("");
  expect(text.length).toBeGreaterThan(0);
  expect(text).not.toContain("kata49");
});
