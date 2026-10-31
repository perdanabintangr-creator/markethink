import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { mayarMode, mayarStatusOf, parseCreated, parseDetail, verifyMayarToken, webhookHints } = await import("@/lib/payments/mayar");
const { activeProvider } = await import("@/lib/payments/gateway");

describe("pembayaran Mayar", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("membaca respons create v1 (objek) & v2 (array)", () => {
    expect(parseCreated({ statusCode: 200, data: { id: "pr-1", transaction_id: "tx-1", link: "https://kopi.myr.id/invoices/abc" } })).toEqual({
      id: "pr-1",
      link: "https://kopi.myr.id/invoices/abc",
      transactionId: "tx-1",
    });
    expect(parseCreated({ data: [{ id: "pr-2", transactionId: "tx-2", paymentLink: "https://x.myr.id/pl/2" }] })?.link).toBe("https://x.myr.id/pl/2");
    expect(parseCreated({ data: { id: "pr-3", link: "javascript:alert(1)" } })).toBeNull();
    expect(parseCreated({ message: "error" })).toBeNull();
  });

  it("status Mayar → status Marqthink", () => {
    expect(mayarStatusOf("paid")).toBe("paid");
    expect(mayarStatusOf("SUCCESS")).toBe("paid");
    expect(mayarStatusOf(true)).toBe("paid");
    expect(mayarStatusOf("unpaid")).toBe("pending");
    expect(mayarStatusOf("closed")).toBe("canceled");
    expect(mayarStatusOf("expired")).toBe("expired");
    expect(mayarStatusOf(undefined)).toBe("pending");
  });

  it("detail: lunas bila status utama atau salah satu transaksinya lunas", () => {
    expect(parseDetail({ data: { id: "pr-1", status: "unpaid", amount: 200000, transactions: [{ status: "paid", paymentMethod: "QRIS" }] } })).toMatchObject({
      status: "paid",
      amount: 200000,
      paymentType: "QRIS",
    });
    expect(parseDetail({ data: [{ status: "unpaid", amount: "300000" }] })).toMatchObject({ status: "pending", amount: 300000 });
    expect(parseDetail({ data: null }).notFound).toBe(true);
  });

  it("token webhook: tidak dicek tanpa MAYAR_WEBHOOK_TOKEN, wajib cocok bila diisi", () => {
    expect(verifyMayarToken("abc", "")).toBeNull();
    expect(verifyMayarToken("abc", "abc")).toBe(true);
    expect(verifyMayarToken("abd", "abc")).toBe(false);
    expect(verifyMayarToken(null, "abc")).toBe(false);
  });

  it("petunjuk webhook: nomor order dari deskripsi & id Mayar", () => {
    const h = webhookHints({
      event: { received: "payment.received" },
      data: { id: "tx-9", productId: "pr-9", status: true, amount: 200000, productName: "Marqthink Pro (1 bulan) · MTK-P-mhd2k1-ab12" },
    });
    expect(h).toEqual({ event: "payment.received", ids: ["tx-9", "pr-9"], orderId: "MTK-P-mhd2k1-ab12", amount: 200000, paidFlag: true });
    expect(webhookHints({ event: "payment.reminder", data: { id: "x1", status: "unpaid" } })).toMatchObject({ event: "payment.reminder", paidFlag: false, orderId: null, ids: [] });
  });

  it("mode sandbox kecuali MAYAR_IS_PRODUCTION=true; Mayar diutamakan bila key terpasang", () => {
    expect(mayarMode(undefined)).toBe("sandbox");
    expect(mayarMode("true")).toBe("production");
    vi.stubEnv("MAYAR_API_KEY", "k");
    vi.stubEnv("DUITKU_MERCHANT_CODE", "D1");
    vi.stubEnv("DUITKU_API_KEY", "d");
    expect(activeProvider(undefined)).toBe("mayar");
    expect(activeProvider("duitku")).toBe("duitku");
  });
});
