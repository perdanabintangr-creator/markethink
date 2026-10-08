import { describe, expect, it } from "vitest";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

describe("prompt caching Claude", () => {
  it("system prompt & percakapan dikirim dengan penanda cache", async () => {
    let body: Record<string, unknown> = {};
    const anthropic = createAnthropic({
      apiKey: "test",
      fetch: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: "msg_1",
            type: "message",
            role: "assistant",
            model: "claude-sonnet-5-5",
            content: [{ type: "text", text: "ok" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 10, output_tokens: 1, cache_read_input_tokens: 900 },
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    });
    const res = await generateText({
      model: anthropic("claude-sonnet-5-5"),
      messages: [
        { role: "system", content: "SYSTEM", providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
        { role: "user", content: "hai" },
      ],
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    });
    expect(body.cache_control).toEqual({ type: "ephemeral" });
    expect((body.system as { cache_control?: unknown }[])[0].cache_control).toEqual({ type: "ephemeral" });
    expect(res.usage.cachedInputTokens).toBe(900);
  });
});
