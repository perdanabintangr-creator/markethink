import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/backoffice/stat";
import { PLAN_NAME } from "@/lib/admin-format";
import { dateID, rupiah } from "@/lib/backoffice-format";
import { activePromo, dateInputWIB } from "@/lib/promo";
import { TARGET_MARGIN, guaranteedMargin } from "@/lib/profit";
import { clearPlanPromo, updateAddon, updatePlanPrice, updatePlanPromo } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Harga paket" };

export default async function PricesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { isOwner } = await requireBackoffice();
  const { error: rawError, saved } = await searchParams;
  const error = rawError?.slice(0, 200);
  const admin = createAdminClient();
  const [{ data: plans }, { data: addons }] = await Promise.all([
    admin.from("plans").select("id, name, monthly_price_idr, monthly_credits, promo_price_idr, promo_label, promo_until, sort_order").neq("id", "beta").order("sort_order"),
    admin.from("addons").select("id, name, tagline, price_idr, monthly_quota, promax_quota, trial_quota").order("sort_order"),
  ]);
  return (
    <div className="max-w-2xl">
      <PageTitle
        title="Harga paket"
        description={`Harga per bulan, dipakai untuk mengisi nominal otomatis saat mencatat penjualan. ${isOwner ? "" : "Hanya owner yang bisa mengubah."}`}
      />
      {error && <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {saved && <p className="mb-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">Promo {PLAN_NAME[saved] ?? saved} tersimpan dan sudah tampil di aplikasi.</p>}
      <Card>
        <CardContent className="divide-y p-0">
          {(plans ?? []).map((p) => {
            const price = Number(p.monthly_price_idr);
            const promo = activePromo(p);
            const expired = p.promo_price_idr !== null && promo === null;
            const paid = promo ?? price;
            const gm = guaranteedMargin(paid, Number(p.monthly_credits));
            return (
              <div key={p.id} id={`promo-${p.id}`} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {PLAN_NAME[p.id] ?? p.name}
                      {promo !== null && <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-white">{p.promo_label || "Promo"} aktif</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {promo !== null ? (
                        <>
                          <span className="line-through">{rupiah(price)}</span> → <b className="text-foreground">{rupiah(promo)}</b> / bulan
                          {p.promo_until && ` · sampai ${dateID(p.promo_until)}`}
                        </>
                      ) : price ? (
                        `${rupiah(price)} / bulan`
                      ) : (
                        "Belum diatur"
                      )}
                    </p>
                  </div>
                  {isOwner && (
                    <form action={updatePlanPrice.bind(null, p.id)} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Normal Rp</span>
                      <Input name="price" inputMode="numeric" defaultValue={p.monthly_price_idr} className="w-32" aria-label={`Harga ${p.name}`} />
                      <Button type="submit" size="sm" variant="outline">Simpan</Button>
                    </form>
                  )}
                </div>
                {isOwner && price > 0 && (
                  <div className="rounded-lg border border-dashed p-3">
                    <p className="mb-2 text-sm font-medium">Harga promo (harga coret)</p>
                    <form action={updatePlanPromo.bind(null, p.id)} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                      <label className="space-y-1 text-xs text-muted-foreground">
                        Harga promo (Rp)
                        <Input name="promo_price" inputMode="numeric" defaultValue={p.promo_price_idr ?? ""} placeholder="mis. 149000" />
                      </label>
                      <label className="space-y-1 text-xs text-muted-foreground">
                        Label (opsional)
                        <Input name="promo_label" maxLength={30} defaultValue={p.promo_label ?? ""} placeholder="Promo 11.11" />
                      </label>
                      <label className="space-y-1 text-xs text-muted-foreground">
                        Berlaku sampai (opsional)
                        <Input name="promo_until" type="date" defaultValue={dateInputWIB(p.promo_until)} />
                      </label>
                      <Button type="submit" size="sm">{promo !== null ? "Ubah promo" : "Pasang promo"}</Button>
                    </form>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {expired ? "Promo terakhir sudah berakhir — harga kembali normal. " : ""}
                        {gm !== null && (
                          <span className={gm < TARGET_MARGIN ? "font-medium text-destructive" : ""}>
                            Laba minimum per akun di harga {promo !== null ? "promo" : "ini"}: {Math.round(gm * 100)}%
                            {gm < TARGET_MARGIN && ` — di bawah target ${Math.round(TARGET_MARGIN * 100)}%, kurangi kredit atau naikkan harga promo`}
                          </span>
                        )}
                      </span>
                      {p.promo_price_idr !== null && (
                        <form action={clearPlanPromo.bind(null, p.id)}>
                          <Button type="submit" size="sm" variant="ghost">Hentikan promo</Button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">Mengubah harga tidak mengubah penjualan yang sudah tercatat. Harga promo langsung tampil (dengan harga normal dicoret) di halaman Paket aplikasi AI, dan otomatis berhenti setelah tanggal akhirnya.</p>

      <h2 className="mt-8 mb-1 text-lg font-semibold">Add-on Tools Pro</h2>
      <p className="mb-3 text-sm text-muted-foreground">Harga per bulan & jatah pemakaian. Promax = gratis per bulan; Percobaan = gratis sekali untuk semua user.</p>
      <Card>
        <CardContent className="divide-y p-0">
          {(addons ?? []).map((a) => (
            <form key={a.id} action={updateAddon.bind(null, a.id)} className="space-y-3 p-4">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.tagline}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ["price", "Harga/bulan (Rp)", a.price_idr],
                    ["monthly_quota", "Kuota/bulan", a.monthly_quota],
                    ["promax_quota", "Gratis Promax", a.promax_quota],
                    ["trial_quota", "Percobaan", a.trial_quota],
                  ] as const
                ).map(([name, label, value]) => (
                  <label key={name} className="space-y-1 text-xs text-muted-foreground">
                    {label}
                    <Input name={name} inputMode="numeric" defaultValue={value} disabled={!isOwner} />
                  </label>
                ))}
              </div>
              {isOwner && <Button type="submit" size="sm">Simpan</Button>}
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
