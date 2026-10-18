import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { newOrderId, paymentStatusOf, validSignature } from "@/lib/payments/midtrans";

describe("pembayaran Midtrans", () => {
  it("tanda tangan notifikasi: SHA512(order_id + status_code + gross_amount + server key)", () => {
    const n = { order_id: "MTK-P-abc-1", status_code: "200", gross_amount: "60000.00" };
    const signature_key = createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}SB-key`).digest("hex");
    expect(validSignature({ ...n, signature_key }, "SB-key")).toBe(true);
    expect(validSignature({ ...n, signature_key }, "kunci-lain")).toBe(false);
    expect(validSignature({ ...n, gross_amount: "1.00", signature_key }, "SB-key")).toBe(false);
    expect(validSignature(n, "SB-key")).toBe(false);
  });

  it("status Midtrans → status Markethink", () => {
    expect(paymentStatusOf({ transaction_status: "settlement" })).toBe("paid");
    expect(paymentStatusOf({ transaction_status: "capture", fraud_status: "accept" })).toBe("paid");
    expect(paymentStatusOf({ transaction_status: "capture", fraud_status: "challenge" })).toBe("pending");
    expect(paymentStatusOf({ transaction_status: "pending" })).toBe("pending");
    expect(paymentStatusOf({ transaction_status: "expire" })).toBe("expired");
    expect(paymentStatusOf({ transaction_status: "deny" })).toBe("failed");
    expect(paymentStatusOf({ transaction_status: "cancel" })).toBe("canceled");
  });

  it("order ID unik dan ≤ 50 karakter", () => {
    const a = newOrderId("bundle");
    expect(a).toMatch(/^MTK-B-/);
    expect(a.length).toBeLessThanOrEqual(50);
    expect(newOrderId("plan")).not.toBe(newOrderId("plan"));
  });
});
