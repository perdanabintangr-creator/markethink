import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Syarat Layanan" };

export default function TermsPage() {
  return (
    <LegalPage title="Syarat Layanan">
      <p>Terakhir diperbarui: 3 November 2026</p>
      <h2>1. Layanan & paket</h2>
      <p>
        Marqthink adalah layanan AI untuk marketing yang tersedia dalam paket <strong>Gratis</strong> dan paket berbayar
        bulanan (Starter, Pro, Promax). Harga dan isi tiap paket tercantum di halaman <a href="/harga">Harga</a>. Fitur dan
        kuota dapat kami perbarui dari waktu ke waktu; perubahan harga tidak berlaku untuk periode yang sudah dibayar.
      </p>
      <h2>1a. Pembayaran</h2>
      <p>
        Pembayaran dilakukan di muka per periode melalui penyedia pembayaran resmi (QRIS, e-wallet, virtual account). Paket aktif
        otomatis setelah pembayaran berhasil dan <strong>tidak diperpanjang otomatis</strong>. Ketentuan pengembalian dana
        mengikuti <a href="/refund">Kebijakan Refund</a>.
      </p>
      <h2>2. Akun</h2>
      <p>
        Marqthink hanya untuk pengguna berusia <strong>18 tahun ke atas</strong>. Dengan mendaftar, kamu menyatakan sudah
        berusia minimal 18 tahun.
      </p>
      <p>Kamu bertanggung jawab menjaga kerahasiaan akun. Satu orang satu akun; pembuatan banyak akun untuk menghindari kuota dilarang.</p>
      <h2>3. Penggunaan yang dilarang</h2>
      <ul>
        <li>Membuat konten yang menipu, review palsu, spam, ujaran kebencian, atau melanggar hukum.</li>
        <li>Mencoba membobol, membebani, atau menyalahgunakan sistem (termasuk otomatisasi berlebihan).</li>
        <li>Memasukkan data pribadi pihak lain tanpa dasar hukum yang sah.</li>
      </ul>
      <h2>4. Output AI</h2>
      <p>
        Jawaban dihasilkan oleh model AI pihak ketiga dan dapat mengandung kesalahan. Kamu bertanggung jawab memverifikasi
        dan menggunakan output secara bijak. Hak atas output yang kamu buat menjadi milikmu sejauh diizinkan hukum.
      </p>
      <h2>5. Data & privasi</h2>
      <p>Pemrosesan data mengikuti <a href="/privacy">Kebijakan Privasi</a> dan UU PDP. Jangan memasukkan data rahasia.</p>
      <h2>6. Penghentian</h2>
      <p>Kami dapat menangguhkan akun yang melanggar syarat ini. Kamu dapat menghapus akun kapan saja.</p>
      <h2>7. Batasan tanggung jawab</h2>
      <p>Layanan disediakan &quot;sebagaimana adanya&quot;. Sejauh diizinkan hukum, tanggung jawab kami terbatas pada jumlah yang kamu bayarkan untuk periode berjalan.</p>
    </LegalPage>
  );
}
