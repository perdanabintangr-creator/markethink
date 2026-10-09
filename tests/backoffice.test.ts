import { describe, expect, it } from "vitest";
import { daysUntil, durationSince, rupiah } from "@/lib/backoffice-format";

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

describe("format back office", () => {
  it("lama berlangganan mudah dibaca", () => {
    expect(durationSince(null)).toBe("-");
    expect(durationSince(ago(0.2))).toBe("hari ini");
    expect(durationSince(ago(12))).toBe("12 hari");
    expect(durationSince(ago(61))).toBe("2 bln");
    expect(durationSince(ago(75))).toMatch(/^2 bln \d+ hr$/);
    expect(durationSince(ago(400))).toBe("1 th 1 bln");
  });

  it("sisa hari masa aktif (negatif = lewat)", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(new Date(Date.now() + 5 * DAY - 1000).toISOString())).toBe(5);
    expect(daysUntil(ago(3))).toBe(-3);
  });

  it("format rupiah", () => {
    expect(rupiah(99000)).toBe("Rp99.000");
    expect(rupiah(null)).toBe("Rp0");
  });
});
