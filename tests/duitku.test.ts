import { createHash } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { duitkuMode, duitkuStatusOf, validDuitkuCallback } = await import("@/lib/payments/duitku");
const { activeProvider } = await import("@/lib/payments/gateway");

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

describe("pembayaran Duitku", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("tanda tangan callback: MD5(merchantCode + amount + merchantOrderId + apiKey)", () => {
    const n = { merchantCode: "DS123", amount: "60000", merchantOrderId: "MTK-P-abc-1" };
    const signature = md5(`DS123${n.amount}${n.merchantOrderId}kunci`);
    expect(validDuitkuCallback({ ...n, signature }, "kunci", "DS123")).toBe(true);
    expect(validDuitkuCallback({ ...n, signature }, "kunci-lain", "DS123")).toBe(false);
    expect(validDuitkuCallback({ ...n, amount: "1000", signature }, "kunci", "DS123")).toBe(false);
    expect(validDuitkuCallback({ ...n, merchantCode: "DSX", signature }, "kunci", "DS123")).toBe(false);
    expect(validDuitkuCallback(n, "kunci", "DS123")).toBe(false);
  });

  it("status Duitku → status Markethink", () => {
    expect(duitkuStatusOf("00")).toBe("paid");
    expect(duitkuStatusOf("01")).toBe("pending");
    expect(duitkuStatusOf("02")).toBe("failed");
    expect(duitkuStatusOf(undefined)).toBe("pending");
  });

  it("mode sandbox kecuali DUITKU_IS_PRODUCTION=true", () => {
    expect(duitkuMode(undefined)).toBe("sandbox");
    expect(duitkuMode("true")).toBe("production");
  });

  it("gateway aktif: Duitku diutamakan bila terpasang, bisa dipilih manual", () => {
    vi.stubEnv("DUITKU_MERCHANT_CODE", "DS1");
    vi.stubEnv("DUITKU_API_KEY", "k");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "m");
    expect(activeProvider("")).toBe("duitku");
    expect(activeProvider("midtrans")).toBe("midtrans");
    vi.stubEnv("DUITKU_API_KEY", "");
    expect(activeProvider("duitku")).toBe("midtrans");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    expect(activeProvider("")).toBeNull();
  });
});
