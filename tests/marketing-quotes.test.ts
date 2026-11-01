import { describe, expect, it } from "vitest";
import { MARKETING_QUOTES } from "@/lib/marketing-quotes";

describe("kata-kata marketing pop-up", () => {
  it("berisi tepat 100 kalimat, tanpa duplikat", () => {
    expect(MARKETING_QUOTES).toHaveLength(100);
    expect(new Set(MARKETING_QUOTES.map((q) => q.text)).size).toBe(100);
  });
  it("tiap kalimat cukup pendek untuk pop-up HP", () => {
    for (const q of MARKETING_QUOTES) expect(q.text.length, q.text).toBeLessThanOrEqual(140);
  });
});
