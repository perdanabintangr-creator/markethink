/**
 * Invoice / bukti bayar Marqthink: dipakai email "Pembayaran berhasil" dan halaman /invoice/[orderId].
 * Murni (tanpa DB) supaya mudah dites.
 */
import { BRAND_CONTACT } from "@/lib/brand";
import { brandEmail, escapeHtml } from "@/lib/email-template";

export interface InvoiceData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  itemName: string;
  /** Paket (plan) id bila kind = plan, untuk judul "Kamu sekarang berlangganan …". */
  planName?: string | null;
  amount: number;
  paymentType: string | null;
  provider: string | null;
  paidAt: string;
  periodStart: string | null;
  periodEnd: string | null;
}

const METHODS: Record<string, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  bank_transfer: "Transfer bank (Virtual Account)",
  echannel: "Mandiri Bill",
  permata: "Permata Virtual Account",
  credit_card: "Kartu kredit/debit",
  cstore: "Gerai retail",
  akulaku: "Akulaku",
  kredivo: "Kredivo",
  dana: "DANA",
  ovo: "OVO",
};

export function paymentMethodLabel(type: string | null, provider: string | null) {
  const gw = provider === "duitku" ? "Duitku" : provider === "mayar" ? "Mayar" : "Midtrans";
  const t = (type ?? "").toLowerCase();
  return METHODS[t] ? `${METHODS[t]} via ${gw}` : type ? `${type} via ${gw}` : gw;
}

export const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export function formatDateID(iso: string | null, withTime = false) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime && { hour: "2-digit", minute: "2-digit" }),
    timeZone: "Asia/Jakarta",
  }) + (withTime ? " WIB" : "");
}

/** Baris-baris rincian invoice (label, isi) — sama untuk email & halaman. */
export function invoiceRows(d: InvoiceData): [string, string][] {
  return [
    ["No. invoice", d.orderId],
    ["Tanggal bayar", formatDateID(d.paidAt, true)],
    ["Pelanggan", `${d.customerName || d.customerEmail} (${d.customerEmail})`],
    ["Item", d.itemName],
    ["Masa aktif", d.periodStart && d.periodEnd ? `${formatDateID(d.periodStart)} – ${formatDateID(d.periodEnd)}` : "-"],
    ["Metode bayar", paymentMethodLabel(d.paymentType, d.provider)],
    ["Status", "LUNAS"],
  ];
}

/** Email "Pembayaran berhasil" berisi invoice ringkas + tombol ke invoice lengkap. */
export function invoiceEmail(d: InvoiceData, appUrl: string) {
  const app = appUrl.replace(/\/$/, "");
  const name = escapeHtml(d.customerName?.split(" ")[0] || "kamu");
  const rows = invoiceRows(d)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 0;color:#5b6475;font-size:14px;width:38%;border-bottom:1px solid #eef0f4">${k}</td><td style="padding:9px 0;font-size:14px;font-weight:600;color:${k === "Status" ? "#059669" : "#0b1220"};border-bottom:1px solid #eef0f4">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  const total = `<tr><td style="padding:14px 0 0;font-size:15px;font-weight:700">Total dibayar</td><td style="padding:14px 0 0;font-size:20px;font-weight:800;color:#0a6cff">${rupiah(d.amount)}</td></tr>`;
  const subject = d.planName ? `Pembayaran berhasil — kamu sekarang berlangganan Marqthink ${d.planName}` : `Pembayaran berhasil — ${d.itemName}`;
  const html = brandEmail({
    appUrl: app,
    eyebrow: "Pembayaran berhasil",
    title: d.planName ? `Kamu sekarang berlangganan Marqthink ${escapeHtml(d.planName)}` : "Terima kasih, pembayaranmu sudah kami terima",
    intro: `Halo ${name}, terima kasih! Pembayaranmu sudah kami terima dan ${
      d.planName ? `paket <b>${escapeHtml(d.planName)}</b> sudah aktif di akun kamu` : "item yang kamu beli sudah aktif"
    }. Berikut rincian invoice-nya.`,
    extra: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">${rows}${total}</table>`,
    button: { label: "Mulai pakai Marqthink", url: `${app}/dashboard` },
    note: `Invoice lengkap (bisa dicetak/simpan PDF): <a href="${app}/invoice/${encodeURIComponent(d.orderId)}" style="color:#0a6cff">${app.replace(/^https?:\/\//, "")}/invoice/${escapeHtml(d.orderId)}</a>.<br>Langganan tidak diperpanjang otomatis. Butuh bantuan atau refund? Lihat ${app.replace(/^https?:\/\//, "")}/refund atau hubungi ${escapeHtml(BRAND_CONTACT.email || "kami")}.`,
  });
  return { subject, html };
}
