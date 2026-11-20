import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Penghapusan Data" };

export default async function DataDeletionPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const code = (await searchParams).code?.replace(/[^a-f0-9]/gi, "").slice(0, 32);
  return (
    <LegalPage title="Penghapusan Data">
      {code && (
        <p>
          Permintaan penghapusan data Instagram kamu sudah kami proses. Kode konfirmasi: <strong>{code}</strong>
        </p>
      )}
      <h2>Data Instagram</h2>
      <p>
        Saat kamu menghubungkan Instagram ke Marqthink (fitur Autopilot Konten), kami menyimpan ID akun, nama pengguna, foto
        profil, dan token akses terenkripsi agar konten yang kamu ACC bisa diposting otomatis. Kami tidak menyimpan kata sandi
        Instagram kamu.
      </p>
      <h2>Cara menghapus</h2>
      <ul>
        <li>Di Marqthink: buka Autopilot Konten lalu klik &quot;Putuskan&quot; pada kartu Instagram. Token & profil langsung dihapus.</li>
        <li>Di Instagram: Pengaturan → Aplikasi dan situs web → hapus Marqthink. Data terkait otomatis kami hapus.</li>
        <li>Untuk menghapus seluruh akun Marqthink beserta datanya, hubungi kami lewat email yang tercantum di Kebijakan Privasi.</li>
      </ul>
    </LegalPage>
  );
}
