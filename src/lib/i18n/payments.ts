import type { Lang } from "./dict";

/** Teks pembayaran otomatis (Midtrans). */
const id = {
  payNow: "Bayar sekarang",
  methods: "QRIS, transfer bank (Virtual Account) & e-wallet. Aktif otomatis begitu pembayaran berhasil.",
  opening: "Membuka halaman pembayaran…",
  failed: "Halaman pembayaran gagal dibuka. Coba lagi sebentar lagi.",
  disabled: "Pembayaran online belum aktif. Kirim permintaan, tim kami kirim cara bayar.",
  checking: "Mengecek pembayaran kamu…",
  waiting: (item: string) => `Menunggu pembayaran ${item}. Halaman ini otomatis diperbarui setelah kamu membayar.`,
  success: (item: string) => `Pembayaran berhasil. ${item} sudah aktif.`,
  failedStatus: "Pembayaran gagal atau kedaluwarsa. Silakan coba lagi.",
  close: "Tutup",
};

const en: typeof id = {
  payNow: "Pay now",
  methods: "QRIS, bank transfer (Virtual Account) & e-wallets. Activates automatically once payment succeeds.",
  opening: "Opening the payment page…",
  failed: "Couldn't open the payment page. Please try again shortly.",
  disabled: "Online payment isn't active yet. Send a request and our team will send payment instructions.",
  checking: "Checking your payment…",
  waiting: (item: string) => `Waiting for payment for ${item}. This page updates automatically after you pay.`,
  success: (item: string) => `Payment successful. ${item} is now active.`,
  failedStatus: "Payment failed or expired. Please try again.",
  close: "Close",
};

export const paymentsText = (lang: Lang | null | undefined) => (lang === "en" ? en : id);
