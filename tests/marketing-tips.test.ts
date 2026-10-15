import { describe, expect, it } from "vitest";
import { MARKETING_TIPS } from "@/lib/marketing-tips";

describe("tips menunggu", () => {
  it("banyak & tidak ada yang kembar", () => {
    expect(MARKETING_TIPS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(MARKETING_TIPS.map((t) => t.toLowerCase())).size).toBe(MARKETING_TIPS.length);
  });
});
