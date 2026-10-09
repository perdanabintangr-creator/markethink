import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { SaleForm } from "@/components/backoffice/sale-form";
import { PageTitle } from "@/components/backoffice/stat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catat penjualan" };

export default async function NewSalePage() {
  const { data: plans } = await createAdminClient().from("plans").select("id, monthly_price_idr");
  const prices = Object.fromEntries((plans ?? []).map((p) => [p.id, Number(p.monthly_price_idr)]));
  return (
    <div className="max-w-3xl">
      <PageTitle
        title="Catat penjualan"
        description="Setelah pelanggan transfer/bayar, catat di sini — paketnya langsung aktif dan masuk laporan. Pelanggan harus sudah punya akun Markethink."
      />
      <Card>
        <CardContent className="p-5">
          <SaleForm prices={prices} />
        </CardContent>
      </Card>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        <li>Perpanjangan paket yang sama otomatis menyambung dari tanggal habis sebelumnya.</li>
        <li>Ganti paket (upgrade/downgrade) = periode baru mulai hari ini, periode lama ditutup.</li>
        <li>Salah catat? Buka detail pelanggan → Riwayat pembayaran → Batalkan.</li>
      </ul>
    </div>
  );
}
