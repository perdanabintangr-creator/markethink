import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Kebijakan Privasi" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Kebijakan Privasi">
      <p>Terakhir diperbarui: 8 Oktober 2026 (pembaruan: pemrosesan paket Free)</p>
      <p>
        Markethink menghormati privasi kamu dan memproses data pribadi sesuai Undang-Undang Nomor 27 Tahun 2022 tentang
        Pelindungan Data Pribadi (UU PDP).
      </p>
      <h2>1. Data yang kami kumpulkan</h2>
      <ul>
        <li>Data akun: nama, email, foto profil (jika login dengan Google).</li>
        <li>Data profil: peran, industri, level pengalaman, tujuan — untuk personalisasi jawaban.</li>
        <li>Konten: pesan chat, Brand Kit, file yang kamu unggah, canvas, dan memory.</li>
        <li>Data teknis: log pemakaian (jumlah token, model, waktu), alamat IP untuk pencegahan penyalahgunaan, serta analitik produk.</li>
      </ul>
      <h2>2. Tujuan pemrosesan</h2>
      <ul>
        <li>Menyediakan layanan AI marketing dan mempersonalisasi jawaban.</li>
        <li>Mengelola kuota, keamanan, dan pencegahan penyalahgunaan.</li>
        <li>Meningkatkan kualitas produk (termasuk dari feedback 👍👎).</li>
      </ul>
      <h2>3. Penyedia AI & layanan pihak ketiga</h2>
      <p>
        Markethink menggunakan penyedia AI pihak ketiga, antara lain <strong>Anthropic (Claude)</strong>, <strong>Google
        Gemini</strong>, OpenRouter (pembuat gambar), Groq, dan Tavily (pencarian web). Isi pesan dan file yang relevan
        dikirim ke penyedia tersebut untuk menghasilkan jawaban dan dapat diproses di luar Indonesia. Kami juga memakai
        Supabase (database & penyimpanan), Vercel (hosting), Upstash (pembatasan akses), Resend (email), PostHog (analitik),
        dan Sentry (pelacakan error).
      </p>
      <p>
        <strong>Paket Free:</strong> jawaban diutamakan diproses oleh layanan <strong>gratis Google Gemini</strong>. Sesuai
        ketentuan Google untuk layanan gratisnya, isi pesan, file, dan jawaban pada paket Free{" "}
        <strong>dapat digunakan Google untuk meningkatkan produknya dan dapat ditinjau oleh peninjau manusia</strong>. Bila
        layanan gratis sedang penuh, pesan diproses oleh Claude (Anthropic). Dengan memakai paket Free, kamu menyetujui
        pemrosesan ini.
      </p>
      <p>
        <strong>Paket Pro & Promax:</strong> diproses oleh layanan AI berbayar (Claude). Sesuai ketentuan penyedia, isi chat
        pada layanan berbayar tidak dipakai untuk melatih model AI mereka.
      </p>
      <p>
        <strong>Jangan memasukkan data rahasia</strong> (data pribadi pelanggan, kata sandi, informasi keuangan sensitif, atau
        rahasia dagang) ke dalam chat maupun file.
      </p>
      <h2>4. Penyimpanan & keamanan</h2>
      <p>
        Data disimpan dengan kontrol akses per pengguna (Row Level Security). Kunci API penyedia AI hanya berada di server.
      </p>
      <h2>5. Hak kamu</h2>
      <p>
        Kamu berhak mengakses, memperbaiki, dan menghapus data. Kamu bisa melihat/menghapus memory di Pengaturan dan
        menghapus akun beserta seluruh data kapan saja melalui <em>Pengaturan → Hapus akun</em>.
      </p>
      <h2>6. Kontak</h2>
      <p>Pertanyaan terkait privasi dapat dikirim ke tim Markethink melalui email yang tercantum di situs.</p>
    </LegalPage>
  );
}
