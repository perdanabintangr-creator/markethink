import { describe, expect, it } from "vitest";
import { pickTier } from "@/components/app/app-context";
import { getTiers } from "@/lib/ai/models.config";
import { buildSystemPrompt } from "@/lib/ai/prompt";

describe("akses otak per paket", () => {
  it("paket gratis selalu jatuh ke Junior", () => {
    expect(pickTier("senior", ["junior"])).toBe("junior");
    expect(pickTier("associate", ["junior"])).toBe("junior");
  });
  it("Pro memakai pilihan user, default Senior", () => {
    const all = ["junior", "senior", "associate"] as const;
    expect(pickTier("associate", [...all])).toBe("associate");
    expect(pickTier(null, [...all])).toBe("senior");
  });
  it("tiap otak punya keahlian & instruksi berbeda yang masuk ke system prompt", async () => {
    const tiers = getTiers({});
    expect(new Set(tiers.map((t) => t.skillPrompt)).size).toBe(3);
    const out = await buildSystemPrompt({}, { tierInstructions: tiers[2].skillPrompt });
    expect(out).toContain("Markethink Associate");
  });
});
