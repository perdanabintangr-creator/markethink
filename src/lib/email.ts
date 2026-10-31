import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

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

const wrap = (body: string) =>
  `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">${body}<p style="color:#888;font-size:12px;margin-top:32px">Marqthink, otak marketing berbasis AI</p></div>`;

export const emails = {
  welcome: (name: string) =>
    wrap(`<h2>Selamat datang di Marqthink, ${name || "kamu"}! 👋</h2>
<p>Akun beta kamu sudah aktif. Kamu dapat kredit gratis setiap hari untuk ngobrol dengan otak marketing kamu.</p>
<p>Mulai dari: buat Project untuk brand kamu, lalu coba agent <b>Campaign Plan</b> atau <b>Content Calendar</b>.</p>
<p><a href="${env.appUrl}/chat">Buka Marqthink →</a></p>`),
  resetPassword: (link: string) =>
    wrap(`<h2>Reset password Marqthink</h2>
<p>Ada permintaan untuk mengganti password akun kamu. Klik tombol di bawah (berlaku 1 jam, bisa dibuka di HP maupun laptop):</p>
<p><a href="${link}" style="display:inline-block;background:#1e5bff;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Buat password baru</a></p>
<p style="color:#666;font-size:13px">Tidak merasa meminta? Abaikan email ini, password kamu tidak berubah.</p>`),
  waitlist: () =>
    wrap(`<h2>Kamu masuk waitlist Marqthink Pro ✨</h2>
<p>Terima kasih! Kami akan kabari begitu paket Pro tersedia, dengan kuota lebih besar dan fitur tambahan.</p>`),
};
