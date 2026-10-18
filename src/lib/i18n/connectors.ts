import type { Lang } from "./dict";
import type { CanvaErrorCode } from "@/lib/connectors/apps";

/** Teks fitur Aplikasi terhubung (mention "@" di chat, kirim ke Canva, Pengaturan). ID + EN. */

const id = {
  // ── Popup "@" di kotak chat ──
  mentionTitle: "Aplikasi",
  mentionHint: "Pilih dengan Enter, tutup dengan Esc",
  connected: "Terhubung",
  notConnected: "Belum terhubung",

  // ── Tombol & kartu hasil ──
  editInCanva: "Edit di Canva",
  sendingToCanva: "Mengirim ke Canva...",
  openInCanva: "Buka di Canva",
  connectCanva: "Hubungkan Canva",
  sentToCanva: "Terkirim ke Canva",
  sentToCanvaDesc: (title: string) => (title ? `"${title}" siap diedit di akun Canva kamu.` : "Desain siap diedit di akun Canva kamu."),
  needsConnectDesc: "Hubungkan akun Canva kamu dulu, lalu coba lagi.",
  canvaLinkNote: "Link edit berlaku 30 hari. Desainnya tetap tersimpan di akun Canva kamu.",
  canvaFailed: "Gagal mengirim ke Canva.",

  // ── Notifikasi setelah kembali dari Canva ──
  toastConnected: "Canva terhubung. Hasil Markethink sekarang bisa dikirim ke Canva.",
  toastDenied: "Menghubungkan Canva dibatalkan.",
  toastError: "Gagal menghubungkan Canva. Coba lagi sebentar lagi.",
  toastDisabled: "Integrasi Canva belum diaktifkan admin.",
  toastDisconnected: "Canva sudah diputus dari akun Markethink kamu.",

  // ── Pengaturan → Aplikasi terhubung ──
  settingsDesc: "Hubungkan aplikasi favoritmu supaya hasil Markethink bisa langsung dikirim dan diedit di sana. Ketik @ di kotak chat untuk memanggilnya.",
  canvaDesc: "Kirim PPT, carousel, poster & gambar AI ke akun Canva kamu sebagai desain yang bisa diedit.",
  connectedAs: (name: string) => `Terhubung sebagai ${name}`,
  notConfigured: "Belum tersedia. Admin perlu mengaktifkan integrasi Canva.",
  connect: "Hubungkan",
  disconnect: "Putuskan",
  disconnectConfirm: "Putuskan Canva? Desain yang sudah dikirim tetap ada di akun Canva kamu.",

  errors: {
    not_configured: "Integrasi Canva belum diaktifkan admin.",
    needs_connect: "Akun Canva belum terhubung (atau aksesnya sudah habis). Hubungkan Canva dulu, lalu coba lagi.",
    not_found: "File tidak ditemukan. Mungkin sudah dihapus.",
    unsupported_file: "Jenis file ini belum bisa dikirim ke Canva. Yang bisa: PPT, PDF, carousel/poster, dan gambar (PNG, JPG, WebP).",
    file_too_big: "File terlalu besar untuk Canva.",
    rate_limited: "Canva sedang membatasi permintaan. Coba lagi dalam 1 menit.",
    timeout: "Canva masih memproses file ini. Coba lagi sebentar lagi; cek juga daftar desain di akun Canva kamu.",
    import_failed: "Canva gagal memproses file ini. Coba lagi sebentar lagi.",
    network: "Tidak bisa menghubungi Canva. Coba lagi sebentar lagi.",
  } as Record<CanvaErrorCode, string>,
};

const en: typeof id = {
  mentionTitle: "Apps",
  mentionHint: "Enter to pick, Esc to close",
  connected: "Connected",
  notConnected: "Not connected",

  editInCanva: "Edit in Canva",
  sendingToCanva: "Sending to Canva...",
  openInCanva: "Open in Canva",
  connectCanva: "Connect Canva",
  sentToCanva: "Sent to Canva",
  sentToCanvaDesc: (title: string) => (title ? `"${title}" is ready to edit in your Canva account.` : "The design is ready to edit in your Canva account."),
  needsConnectDesc: "Connect your Canva account first, then try again.",
  canvaLinkNote: "The edit link is valid for 30 days. The design stays in your Canva account.",
  canvaFailed: "Couldn't send to Canva.",

  toastConnected: "Canva connected. You can now send Markethink results to Canva.",
  toastDenied: "Connecting Canva was cancelled.",
  toastError: "Couldn't connect Canva. Please try again shortly.",
  toastDisabled: "The Canva integration hasn't been enabled by the admin yet.",
  toastDisconnected: "Canva has been disconnected from your Markethink account.",

  settingsDesc: "Connect your favorite apps so Markethink results can be sent and edited there directly. Type @ in the chat box to call one.",
  canvaDesc: "Send decks, carousels, posters & AI images to your Canva account as editable designs.",
  connectedAs: (name: string) => `Connected as ${name}`,
  notConfigured: "Not available yet. The admin needs to enable the Canva integration.",
  connect: "Connect",
  disconnect: "Disconnect",
  disconnectConfirm: "Disconnect Canva? Designs you already sent stay in your Canva account.",

  errors: {
    not_configured: "The Canva integration hasn't been enabled by the admin yet.",
    needs_connect: "Your Canva account isn't connected (or access has expired). Connect Canva first, then try again.",
    not_found: "File not found. It may have been deleted.",
    unsupported_file: "This file type can't be sent to Canva yet. Supported: decks, PDFs, carousels/posters, and images (PNG, JPG, WebP).",
    file_too_big: "The file is too large for Canva.",
    rate_limited: "Canva is limiting requests right now. Please try again in a minute.",
    timeout: "Canva is still processing this file. Try again shortly, and check the designs in your Canva account.",
    import_failed: "Canva couldn't process this file. Please try again shortly.",
    network: "Couldn't reach Canva. Please try again shortly.",
  },
};

export type ConnectorsText = typeof id;
export const connectorsText = (lang: Lang | null | undefined): ConnectorsText => (lang === "en" ? en : id);
