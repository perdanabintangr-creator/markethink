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

describe("password back office", async () => {
  const { hashPassword, verifyPassword, USERNAME_RE, normalizeUsername } = await import("@/lib/backoffice");

  it("hash scrypt: benar diterima, salah ditolak, salt acak", async () => {
    const h = await hashPassword("rahasia-123");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(h).not.toContain("rahasia-123");
    expect(await verifyPassword("rahasia-123", h)).toBe(true);
    expect(await verifyPassword("rahasia-124", h)).toBe(false);
    expect(await hashPassword("rahasia-123")).not.toBe(h);
    expect(await verifyPassword("x", "bukan-hash")).toBe(false);
  });

  it("username dinormalisasi & divalidasi", () => {
    expect(normalizeUsername("  Rina.Sales ")).toBe("rina.sales");
    expect(USERNAME_RE.test("rina.sales")).toBe(true);
    expect(USERNAME_RE.test("ri")).toBe(false);
    expect(USERNAME_RE.test("rina sales")).toBe(false);
  });
});

describe("kode setup owner pertama", async () => {
  const { verifySetupCode, setupCodeConfigured } = await import("@/lib/backoffice");

  it("tanpa env → setup tertutup", () => {
    delete process.env.BACKOFFICE_SETUP_CODE;
    expect(setupCodeConfigured()).toBe(false);
    expect(verifySetupCode("apa-saja")).toBe(false);
  });

  it("kode pendek (< 8) tidak dianggap valid", () => {
    process.env.BACKOFFICE_SETUP_CODE = "1234";
    expect(setupCodeConfigured()).toBe(false);
    expect(verifySetupCode("1234")).toBe(false);
  });

  it("kode cocok diterima, salah ditolak", () => {
    process.env.BACKOFFICE_SETUP_CODE = "kopi-pagi-2026";
    expect(setupCodeConfigured()).toBe(true);
    expect(verifySetupCode("kopi-pagi-2026")).toBe(true);
    expect(verifySetupCode(" kopi-pagi-2026 ")).toBe(true);
    expect(verifySetupCode("kopi-pagi-2025")).toBe(false);
    delete process.env.BACKOFFICE_SETUP_CODE;
  });
});
