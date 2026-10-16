import { expect, it } from "vitest";
import { createUIMessageStream, readUIMessageStream, streamText, simulateReadableStream } from "ai";
import { MockLanguageModelV2 } from "ai/test";

// Pola di /api/chat: "start" ditulis sendiri di awal, jawaban AI digabung dengan sendStart:false.
// Bila ID berganti di tengah jalan, layar chat menampilkan jawaban dobel.
it("jawaban chat memakai satu ID pesan dari awal sampai akhir", async () => {
  const model = new MockLanguageModelV2({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: "Halo" },
          { type: "text-end", id: "t" },
          { type: "finish", finishReason: "stop", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } },
        ],
      }),
    }),
  });
  const stream = createUIMessageStream({
    originalMessages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "hai" }] }],
    generateId: () => "gen-x",
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: "resp-1", messageMetadata: { tier: "junior" } });
      writer.write({ type: "source-url", sourceId: "1", url: "https://a.com", title: "A" });
      writer.merge(streamText({ model, prompt: "hai" }).toUIMessageStream({ sendStart: false, sendSources: true }));
    },
  });
  const ids = new Set<string>();
  let last;
  for await (const m of readUIMessageStream({ stream })) {
    ids.add(m.id);
    last = m;
  }
  expect([...ids]).toEqual(["resp-1"]);
  expect(last?.metadata).toEqual({ tier: "junior" });
  expect(last?.parts.filter((p) => p.type === "source-url")).toHaveLength(1);
});
