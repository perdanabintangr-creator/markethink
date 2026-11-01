/**
 * Template email Marqthink (gaya kartu profesional: logo, label kecil, judul besar, langkah bernomor, tombol).
 * Sengaja tanpa import (bisa dijalankan langsung oleh Node untuk membuat template email Supabase).
 * Semua style inline + tabel agar rapi di Gmail, Outlook, dan aplikasi email HP.
 */
export interface BrandEmail {
  /** Label kecil di atas judul, mis. "Akun baru". */
  eyebrow?: string;
  title: string;
  /** Paragraf pembuka (boleh berisi <b>). */
  intro: string;
  steps?: { title: string; desc: string }[];
  button?: { label: string; url: string };
  /** Catatan kecil di bawah tombol. */
  note?: string;
  /** Konten tambahan (HTML) setelah intro, mis. daftar perubahan. */
  extra?: string;
  appUrl?: string;
}

const BLUE = "#0a6cff";
const CYAN = "#12d0f5";
const INK = "#0b1220";
const MUTED = "#5b6475";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function brandEmail(e: BrandEmail) {
  const app = (e.appUrl ?? "https://marqthink.com").replace(/\/$/, "");
  const steps = e.steps?.length
    ? `<tr><td style="padding:8px 40px 0"><div style="border-top:1px solid #e6e9f0;margin:8px 0 20px"></div></td></tr>
${e.steps
  .map(
    (s, i) => `<tr><td style="padding:0 40px 18px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="top" style="padding-right:14px"><div style="width:28px;height:28px;border-radius:14px;background:#eef3ff;color:${BLUE};font:700 13px/28px ${FONT};text-align:center">${i + 1}</div></td>
    <td valign="top" style="font-family:${FONT}"><div style="font-size:16px;font-weight:700;color:${INK};line-height:1.4">${s.title}</div><div style="font-size:14px;color:${MUTED};line-height:1.55;margin-top:2px">${s.desc}</div></td>
  </tr></table>
</td></tr>`,
  )
  .join("\n")}`
    : "";
  const button = e.button
    ? `<tr><td style="padding:12px 40px 8px"><a href="${e.button.url}" style="display:inline-block;background:${BLUE};background-image:linear-gradient(90deg,${BLUE},${CYAN});color:#ffffff;font:700 15px ${FONT};text-decoration:none;padding:13px 26px;border-radius:999px">${e.button.label} &rarr;</a></td></tr>`
    : "";
  const note = e.note ? `<tr><td style="padding:14px 40px 0;font:13px/1.6 ${FONT};color:${MUTED}">${e.note}</td></tr>` : "";
  const extra = e.extra ? `<tr><td style="padding:4px 40px 8px;font:15px/1.65 ${FONT};color:${INK}">${e.extra}</td></tr>` : "";

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e.title}</title></head>
<body style="margin:0;padding:0;background:#f4f6fb">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fb;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e6e9f0;border-radius:14px;overflow:hidden">
  <tr><td style="height:6px;background:${BLUE};background-image:linear-gradient(90deg,${BLUE},${CYAN});font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:36px 40px 8px;background:#f6f8ff;background-image:linear-gradient(160deg,#eef3ff 0%,#ffffff 70%)">
    <img src="${app}/brand/marqthink-logo-on-light.png" width="160" height="49" alt="Marqthink" style="display:block;border:0;width:160px;height:auto">
    ${e.eyebrow ? `<div style="font:700 14px ${FONT};color:${BLUE};margin-top:30px">${e.eyebrow}</div>` : `<div style="height:24px"></div>`}
    <h1 style="font:800 28px/1.25 ${FONT};color:${INK};margin:10px 0 0">${e.title}</h1>
    <p style="font:16px/1.65 ${FONT};color:#3a4254;margin:14px 0 22px">${e.intro}</p>
  </td></tr>
  ${extra}
  ${steps}
  ${button}
  ${note}
  <tr><td style="padding:32px 40px 30px">
    <div style="border-top:1px solid #e6e9f0;padding-top:18px;font:12px/1.7 ${FONT};color:#8a93a6">
      <b style="color:${INK}">Marqthink</b> &middot; Otak marketing untuk brand kamu.<br>
      <a href="${app}" style="color:${BLUE};text-decoration:none">marqthink.com</a> &middot;
      <a href="https://www.instagram.com/marqthink.ai/" style="color:${BLUE};text-decoration:none">Instagram @marqthink.ai</a><br>
      Email ini dikirim otomatis, mohon tidak dibalas.
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
