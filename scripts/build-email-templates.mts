/**
 * Membuat template email Supabase (daftar, reset password, magic link, ganti email, undangan) dengan desain Marqthink.
 * Jalankan: node scripts/build-email-templates.mts → hasil di supabase/email-templates/*.html
 * Lalu tempel ke Supabase → Authentication → Emails → Templates. Variabel {{ .ConfirmationURL }} diisi Supabase.
 */
import { writeFileSync } from "node:fs";
import { brandEmail } from "../src/lib/email-template.ts";

const URL = "{{ .ConfirmationURL }}";
const templates: Record<string, { subject: string; html: string }> = {
  "1-confirm-signup": {
    subject: "Konfirmasi email kamu untuk Marqthink",
    html: brandEmail({
      eyebrow: "Akun baru",
      title: "Satu langkah lagi",
      intro: "Terima kasih sudah mendaftar di Marqthink. Klik tombol di bawah untuk mengonfirmasi email kamu dan mengaktifkan akun.",
      button: { label: "Konfirmasi email", url: URL },
      note: "Tidak merasa mendaftar? Abaikan email ini.",
    }),
  },
  "2-reset-password": {
    subject: "Reset password Marqthink",
    html: brandEmail({
      eyebrow: "Keamanan akun",
      title: "Reset password kamu",
      intro: "Ada permintaan untuk mengganti password akun Marqthink kamu. Klik tombol di bawah untuk membuat password baru.",
      button: { label: "Buat password baru", url: URL },
      note: "Tidak merasa meminta? Abaikan email ini. Password kamu tidak berubah.",
    }),
  },
  "3-magic-link": {
    subject: "Link masuk Marqthink",
    html: brandEmail({
      eyebrow: "Masuk",
      title: "Link masuk kamu",
      intro: "Klik tombol di bawah untuk masuk ke Marqthink tanpa password. Link hanya berlaku sebentar dan sekali pakai.",
      button: { label: "Masuk ke Marqthink", url: URL },
      note: "Tidak merasa meminta? Abaikan email ini.",
    }),
  },
  "4-change-email": {
    subject: "Konfirmasi email baru Marqthink",
    html: brandEmail({
      eyebrow: "Keamanan akun",
      title: "Konfirmasi email baru",
      intro: "Ada permintaan untuk mengganti email akun Marqthink kamu menjadi <b>{{ .NewEmail }}</b>. Klik tombol di bawah untuk mengonfirmasi.",
      button: { label: "Konfirmasi email baru", url: URL },
      note: "Tidak merasa meminta? Abaikan email ini dan segera ganti password kamu.",
    }),
  },
  "5-invite": {
    subject: "Kamu diundang ke Marqthink",
    html: brandEmail({
      eyebrow: "Undangan",
      title: "Kamu diundang ke Marqthink",
      intro: "Kamu diundang untuk memakai Marqthink, otak marketing berbasis AI. Klik tombol di bawah untuk menerima undangan dan membuat akun.",
      button: { label: "Terima undangan", url: URL },
    }),
  },
};

for (const [name, t] of Object.entries(templates)) {
  writeFileSync(`supabase/email-templates/${name}.html`, t.html);
  console.log(`${name}.html  —  Subject: ${t.subject}`);
}
