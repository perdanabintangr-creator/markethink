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
  `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">${body}<p style="color:#888;font-size:12px;margin-top:32px">Markethink — otak marketing berbasis AI</p></div>`;

export const emails = {
  welcome: (name: string) =>
    wrap(`<h2>Selamat datang di Markethink, ${name || "kamu"}! 👋</h2>
<p>Akun beta kamu sudah aktif. Kamu dapat kredit gratis setiap hari untuk ngobrol dengan otak marketing kamu.</p>
<p>Mulai dari: buat Project untuk brand kamu, lalu coba agent <b>Campaign Plan</b> atau <b>Content Calendar</b>.</p>
<p><a href="${env.appUrl}/chat">Buka Markethink →</a></p>`),
  waitlist: () =>
    wrap(`<h2>Kamu masuk waitlist Markethink Pro ✨</h2>
<p>Terima kasih! Kami akan kabari begitu paket Pro tersedia — dengan kuota lebih besar dan fitur tambahan.</p>`),
};
