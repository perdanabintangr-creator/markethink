/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { resultToMarkdown } from "@/lib/addons/to-markdown";

const fixtures = Object.values(import.meta.glob<{ default: { tool: string; output: unknown } }>("./fixtures/pro/*.ts", { eager: true })).map((m) => m.default);

describe("hasil Tools Pro → Markdown untuk chat", () => {
  for (const fx of fixtures) {
    it(`${fx.tool}: menjadi dokumen yang terbaca`, () => {
      const md = resultToMarkdown(fx.output);
      expect(md.length).toBeGreaterThan(200);
      expect(md).not.toContain("[object Object]");
      expect(md.length).toBeLessThanOrEqual(24_200);
    });
  }
  it("sumber menjadi tautan", () => {
    expect(resultToMarkdown({ summary: "x", sources: [{ title: "BPS", url: "https://bps.go.id" }] })).toContain("[BPS](https://bps.go.id)");
  });
});
