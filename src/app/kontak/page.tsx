import { LegalPage } from "@/components/legal-page";
import { BRAND, BRAND_CONTACT, BRAND_SOCIALS } from "@/lib/brand";

export const metadata = { title: "Kontak", description: `Hubungi tim ${BRAND}: bantuan akun, pembayaran, dan kerja sama.` };

const waDisplay = (n: string) => `+62 ${n.slice(2, 5)}-${n.slice(5, 9)}-${n.slice(9)}`;

export default function ContactPage() {
  const c = BRAND_CONTACT as { email: string; whatsapp: string; address: string; nib: string };
  return (
    <LegalPage title="Kontak">
      <p>Ada pertanyaan soal akun, pembayaran, refund, atau kerja sama? Hubungi tim {BRAND} lewat salah satu kanal berikut.</p>
      <ul>
        {c.email && (
          <li>
            <strong>Email:</strong> <a href={`mailto:${c.email}`}>{c.email}</a>
          </li>
        )}
        {c.whatsapp && (
          <li>
            <strong>WhatsApp:</strong>{" "}
            <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noopener noreferrer">
              {waDisplay(c.whatsapp)}
            </a>
          </li>
        )}
        <li>
          <strong>Instagram:</strong>{" "}
          <a href={BRAND_SOCIALS.instagram.url} target="_blank" rel="noopener noreferrer">
            @{BRAND_SOCIALS.instagram.handle}
          </a>
        </li>
        {c.address && (
          <li>
            <strong>Lokasi:</strong> {c.address}
          </li>
        )}
        {c.nib && (
          <li>
            <strong>NIB:</strong> {c.nib} (usaha perseorangan a.n. Perdana Bintang Rinaldi)
          </li>
        )}
      </ul>
      <h2>Jam layanan</h2>
      <p>Senin–Jumat, 09.00–17.00 WIB. Pesan di luar jam tersebut kami balas pada hari kerja berikutnya (paling lambat 2 hari kerja).</p>
      <h2>Pembayaran & refund</h2>
      <p>
        Untuk masalah pembayaran, sertakan email akun dan nomor tagihan (diawali “MTK-”). Ketentuan pengembalian dana ada di{" "}
        <a href="/refund">Kebijakan Refund</a>.
      </p>
    </LegalPage>
  );
}
