import { describe, expect, it } from "vitest";
import { invoiceEmail, invoiceRows, paymentMethodLabel, rupiah } from "@/lib/invoice";

const inv = {
  orderId: "MTK-P-mwah4xr6-5632",
  customerName: "Perdana Bintang",
  customerEmail: "a@b.co",
  itemName: "Langganan Marqthink Pro (1 bulan)",
  planName: "Pro",
  amount: 200000,
  paymentType: "qris",
  provider: "midtrans",
  paidAt: "2026-11-10T09:15:19Z",
  periodStart: "2026-11-10T09:15:20Z",
  periodEnd: "2026-12-10T09:15:20Z",
};

describe("invoice pembayaran", () => {
  it("label metode & rupiah", () => {
    expect(paymentMethodLabel("qris", "midtrans")).toBe("QRIS via Midtrans");
    expect(paymentMethodLabel(null, "duitku")).toBe("Duitku");
    expect(rupiah(200000)).toBe("Rp200.000");
  });
  it("rincian berisi nomor, masa aktif, dan status lunas", () => {
    const rows = Object.fromEntries(invoiceRows(inv));
    expect(rows["No. invoice"]).toBe(inv.orderId);
    expect(rows["Masa aktif"]).toContain("10 November 2026");
    expect(rows["Masa aktif"]).toContain("10 Desember 2026");
    expect(rows.Status).toBe("LUNAS");
  });
  it("email berjudul langganan paket + link invoice", () => {
    const { subject, html } = invoiceEmail(inv, "https://marqthink.com/");
    expect(subject).toContain("berlangganan Marqthink Pro");
    expect(html).toContain("Rp200.000");
    expect(html).toContain("https://marqthink.com/invoice/MTK-P-mwah4xr6-5632");
  });
});
