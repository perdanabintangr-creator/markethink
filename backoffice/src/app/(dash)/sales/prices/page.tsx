import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/backoffice/stat";
import { PLAN_NAME } from "@/lib/admin-format";
import { rupiah } from "@/lib/backoffice-format";
import { updatePlanPrice } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Harga paket" };

export default async function PricesPage() {
  const { isOwner } = await requireBackoffice();
  const { data: plans } = await createAdminClient().from("plans").select("id, name, monthly_price_idr, sort_order").neq("id", "beta").order("sort_order");
  return (
    <div className="max-w-2xl">
      <PageTitle
        title="Harga paket"
        description={`Harga per bulan, dipakai untuk mengisi nominal otomatis saat mencatat penjualan. ${isOwner ? "" : "Hanya owner yang bisa mengubah."}`}
      />
      <Card>
        <CardContent className="divide-y p-0">
          {(plans ?? []).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{PLAN_NAME[p.id] ?? p.name}</p>
                <p className="text-sm text-muted-foreground">{p.monthly_price_idr ? `${rupiah(p.monthly_price_idr)} / bulan` : "Belum diatur"}</p>
              </div>
              {isOwner && (
                <form action={updatePlanPrice.bind(null, p.id)} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rp</span>
                  <Input name="price" inputMode="numeric" defaultValue={p.monthly_price_idr} className="w-36" aria-label={`Harga ${p.name}`} />
                  <Button type="submit" size="sm">Simpan</Button>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">Mengubah harga tidak mengubah penjualan yang sudah tercatat.</p>
    </div>
  );
}
