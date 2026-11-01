import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { brandEmail, escapeHtml } from "@/lib/email-template";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!env.resendKey) return { skipped: true };
  try {
    const resend = new Resend(env.resendKey);
    await resend.emails.send({ from: env.emailFrom, to, subject, html });
    return { skipped: false };
  } catch (err) {
    console.error("[email] gagal kirim", err);
    return { skipped: true };
  }
}

const app = () => env.appUrl;

export const emails = {
  welcome: (name: string) =>
    brandEmail({
      appUrl: app(),
      eyebrow: "Akun baru",
      title: "Selamat datang di Marqthink",
      intro: `Halo ${escapeHtml(name || "kamu")}, akun kamu sudah aktif. Marqthink adalah otak marketing berbasis AI yang membantu kamu meriset, menyusun strategi, dan membuat konten untuk brand kamu.`,
      steps: [
        { title: "Lengkapi Brand Kit", desc: "Isi nama brand, produk, target pembeli, dan gaya bahasa. Semua jawaban AI akan menyesuaikan brand kamu." },
        { title: "Ajukan pertanyaan pertama", desc: "Ceritakan masalah marketing kamu dengan bahasa sehari-hari, misalnya “penjualan turun, harus mulai dari mana?”." },
        { title: "Buat rencana konten", desc: "Pakai Kalender konten atau Smart Tools untuk mendapatkan caption, copy iklan, dan jadwal posting siap pakai." },
      ],
      button: { label: "Buka Marqthink", url: `${app()}/dashboard` },
      note: "Butuh bantuan? Balas pertanyaan kamu langsung di chat Marqthink atau hubungi kami lewat Instagram @marqthink.ai.",
    }),
  resetPassword: (link: string) =>
    brandEmail({
      appUrl: app(),
      eyebrow: "Keamanan akun",
      title: "Reset password kamu",
      intro: "Ada permintaan untuk mengganti password akun Marqthink kamu. Klik tombol di bawah untuk membuat password baru. Link berlaku 1 jam dan bisa dibuka di HP maupun laptop.",
      button: { label: "Buat password baru", url: link },
      note: "Tidak merasa meminta? Abaikan email ini. Password kamu tidak berubah.",
    }),
  waitlist: () =>
    brandEmail({
      appUrl: app(),
      eyebrow: "Waitlist",
      title: "Kamu masuk waitlist Marqthink Pro",
      intro: "Terima kasih! Kami akan mengabari kamu begitu paket Pro tersedia, dengan kuota lebih besar dan fitur tambahan.",
      button: { label: "Lihat paket", url: `${app()}/harga` },
    }),
  /** Email uji dari panel admin. */
  test: () =>
    brandEmail({
      appUrl: app(),
      eyebrow: "Tes email",
      title: "Email Marqthink sudah terkirim",
      intro: "Kalau kamu membaca ini, pengiriman email dari Marqthink lewat Resend sudah berjalan dengan benar.",
    }),
  /** Pantau mingguan: hasil baru siap. */
  watchUpdate: (title: string, changes: string[], url: string, en: boolean) =>
    brandEmail({
      appUrl: app(),
      eyebrow: en ? "Weekly monitoring" : "Pantau mingguan",
      title: escapeHtml(title),
      intro: en ? "Here's what changed this week:" : "Ini yang berubah minggu ini:",
      extra: `<ul style="margin:0;padding-left:20px">${changes.map((c) => `<li style="margin-bottom:6px">${escapeHtml(c)}</li>`).join("")}</ul>`,
      button: { label: en ? "Open the full result" : "Buka hasil lengkap", url },
    }),
  /** Pantau mingguan: tertunda (kuota/akses). */
  watchPaused: (name: string, message: string, en: boolean) =>
    brandEmail({
      appUrl: app(),
      eyebrow: en ? "Weekly monitoring" : "Pantau mingguan",
      title: en ? `Monitoring paused: ${escapeHtml(name)}` : `Pantau mingguan tertunda: ${escapeHtml(name)}`,
      intro: escapeHtml(message),
      button: { label: en ? "See plans" : "Lihat paket", url: `${app()}/pricing` },
    }),
};
