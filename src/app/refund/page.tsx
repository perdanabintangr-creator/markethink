import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Kebijakan Refund",
  description: "Kebijakan pengembalian dana (refund) dan penghentian langganan Marqthink.",
};

export default function RefundPage() {
  return (
    <LegalPage title="Kebijakan Refund">
      <p>Terakhir diperbarui: 3 November 2026</p>
      <p>
        Kami ingin kamu puas memakai Marqthink. Halaman ini menjelaskan kapan kamu bisa meminta pengembalian dana (refund) dan
        bagaimana menghentikan langganan.
      </p>

      <h2>1. Refund penuh dalam 3×24 jam</h2>
      <p>
        Kamu berhak atas <strong>refund penuh</strong> bila permintaan diajukan paling lambat <strong>3×24 jam</strong> sejak
        pembayaran berhasil <strong>dan</strong> pemakaian kuota paket yang dibeli <strong>belum lebih dari 10%</strong>.
      </p>

      <h2>2. Setelah 3×24 jam atau pemakaian di atas 10%</h2>
      <p>
        Pembayaran tidak dapat dikembalikan. Paket tetap aktif dan bisa kamu pakai sampai akhir periode yang sudah dibayar.
      </p>

      <h2>3. Berhenti berlangganan kapan saja</h2>
      <p>
        Langganan Marqthink <strong>tidak diperpanjang otomatis</strong>. Bila tidak ingin melanjutkan, cukup tidak membayar
        periode berikutnya; paket kembali ke versi gratis setelah periode berakhir. Tidak ada biaya pembatalan.
      </p>

      <h2>4. Pembayaran ganda atau gagal</h2>
      <p>
        Bila saldo terpotong tetapi paket tidak aktif, atau kamu terbayar dua kali untuk tagihan yang sama, hubungi kami. Kelebihan
        pembayaran akan dikembalikan penuh setelah dicek.
      </p>

      <h2>5. Cara mengajukan refund</h2>
      <ol>
        <li>
          Hubungi kami lewat halaman <a href="/kontak">Kontak</a> dengan menyebutkan email akun dan nomor tagihan (diawali
          “MTK-”).
        </li>
        <li>Kami membalas paling lambat 2 hari kerja dan memberi tahu hasil pengecekan.</li>
        <li>
          Bila disetujui, dana dikembalikan ke metode pembayaran semula atau ke rekening atas nama pembayar dalam{" "}
          <strong>7–14 hari kerja</strong>, tergantung bank atau penyedia pembayaran.
        </li>
      </ol>

      <h2>6. Pengecualian</h2>
      <p>
        Refund tidak berlaku untuk akun yang ditangguhkan karena melanggar <a href="/terms">Syarat Layanan</a>, misalnya
        penyalahgunaan sistem atau pembuatan banyak akun.
      </p>
    </LegalPage>
  );
}
