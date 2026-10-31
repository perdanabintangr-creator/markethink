import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { ENABLED_PAYMENTS, modeOf, newOrderId, paymentStatusOf, validSignature } from "@/lib/payments/midtrans";

describe("pembayaran Midtrans", () => {
  it("QRIS tampil paling atas & GoPay e-money disembunyikan", () => {
    expect(ENABLED_PAYMENTS[0]).toBe("other_qris");
    expect(ENABLED_PAYMENTS).not.toContain("gopay");
  });

  it("tanda tangan notifikasi: SHA512(order_id + status_code + gross_amount + server key)", () => {
    const n = { order_id: "MTK-P-abc-1", status_code: "200", gross_amount: "60000.00" };
    const signature_key = createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}SB-key`).digest("hex");
    expect(validSignature({ ...n, signature_key }, "SB-key")).toBe(true);
    expect(validSignature({ ...n, signature_key }, "kunci-lain")).toBe(false);
    expect(validSignature({ ...n, gross_amount: "1.00", signature_key }, "SB-key")).toBe(false);
    expect(validSignature(n, "SB-key")).toBe(false);
  });

  it("status Midtrans → status Marqthink", () => {
    expect(paymentStatusOf({ transaction_status: "settlement" })).toBe("paid");
    expect(paymentStatusOf({ transaction_status: "capture", fraud_status: "accept" })).toBe("paid");
    expect(paymentStatusOf({ transaction_status: "capture", fraud_status: "challenge" })).toBe("pending");
    expect(paymentStatusOf({ transaction_status: "pending" })).toBe("pending");
    expect(paymentStatusOf({ transaction_status: "expire" })).toBe("expired");
    expect(paymentStatusOf({ transaction_status: "deny" })).toBe("failed");
    expect(paymentStatusOf({ transaction_status: "cancel" })).toBe("canceled");
  });

  it("mode: sandbox kecuali MIDTRANS_IS_PRODUCTION=true (key sandbox baru tanpa awalan SB-)", () => {
    expect(modeOf("Mid-server-abc", undefined)).toBe("sandbox");
    expect(modeOf("SB-Mid-server-abc", undefined)).toBe("sandbox");
    expect(modeOf("Mid-server-abc", "true")).toBe("production");
  });

  it("order ID unik dan ≤ 50 karakter", () => {
    const a = newOrderId("bundle");
    expect(a).toMatch(/^MTK-B-/);
    expect(a.length).toBeLessThanOrEqual(50);
    expect(newOrderId("plan")).not.toBe(newOrderId("plan"));
  });
});
