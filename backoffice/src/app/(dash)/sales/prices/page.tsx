import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/backoffice/stat";
import { ADDON_NAME, PLAN_NAME } from "@/lib/admin-format";
import { dateID, rupiah } from "@/lib/backoffice-format";
import { dateInputWIB, promoPrice } from "@/lib/promo";
import { TARGET_MARGIN, guaranteedMargin } from "@/lib/profit";
import {
  clearAddonPromo,
  clearPlanPromo,
  updateAddon,
  updateAddonPromo,
  updatePlanPrice,
  updatePlanPromo,
} from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Harga paket" };

interface PromoFields {
  promo_price_idr: number | null;
  promo_label: string | null;
  promo_until: string | null;
}

/** Ringkasan harga: normal, atau normal dicoret → promo. */
function PriceLine({ price, promo, until }: { price: number; promo: number | null; until: string | null }) {
  if (promo !== null)
    return (
      <>
        <span className="line-through">{rupiah(price)}</span> → <b className="text-foreground">{rupiah(promo)}</b> / bulan
        {until && ` · sampai ${dateID(until)}`}
      </>
    );
  return <>{price ? `${rupiah(price)} / bulan` : "Belum diatur"}</>;
}

/** Form harga promo (harga coret) — dipakai paket & add-on. */
function PromoForm({
  row,
  active,
  save,
  stop,
  placeholder,
  note,
}: {
  row: PromoFields;
  active: boolean;
  save: (formData: FormData) => Promise<void>;
  stop: () => Promise<void>;
  placeholder: string;
  note?: React.ReactNode;
}) {
  const expired = row.promo_price_idr !== null && !active;
  return (
    <div className="rounded-lg border border-dashed p-3">
      <p className="mb-2 text-sm font-medium">Harga promo (harga coret)</p>
      <form action={save} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className="space-y-1 text-xs text-muted-foreground">
          Harga promo (Rp)
          <Input name="promo_price" inputMode="numeric" defaultValue={row.promo_price_idr ?? ""} placeholder={placeholder} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Label (opsional)
          <Input name="promo_label" maxLength={30} defaultValue={row.promo_label ?? ""} placeholder="Promo 11.11" />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Berlaku sampai (opsional)
          <Input name="promo_until" type="date" defaultValue={dateInputWIB(row.promo_until)} />
        </label>
        <Button type="submit" size="sm">{active ? "Ubah promo" : "Pasang promo"}</Button>
      </form>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {expired ? "Promo terakhir sudah berakhir, harga kembali normal. " : ""}
          {note}
        </span>
        {row.promo_price_idr !== null && (
          <form action={stop}>
            <Button type="submit" size="sm" variant="ghost">Hentikan promo</Button>
          </form>
        )}
      </div>
    </div>
  );
}

const PromoBadge = ({ label }: { label: string | null }) => (
  <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-white">{label || "Promo"} aktif</span>
);

export default async function PricesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { isOwner } = await requireBackoffice();
  const { error: rawError, saved } = await searchParams;
  const error = rawError?.slice(0, 200);
  const [savedKind, savedId] = (saved ?? "").split(":");
  const savedName = savedKind === "plan" ? (PLAN_NAME[savedId] ?? savedId) : savedKind === "addon" ? `add-on ${ADDON_NAME[savedId] ?? savedId}` : null;
  const admin = createAdminClient();
  const [{ data: plans }, { data: addons }] = await Promise.all([
    admin
      .from("plans")
      .select("id, name, monthly_price_idr, monthly_credits, promo_price_idr, promo_label, promo_until, sort_order")
      .neq("id", "beta")
      .order("sort_order"),
    admin
      .from("addons")
      .select("id, name, tagline, price_idr, monthly_quota, promax_quota, trial_quota, is_active, promo_price_idr, promo_label, promo_until")
      .order("sort_order"),
  ]);
  return (
    <div className="max-w-2xl">
      <PageTitle
        title="Harga paket"
        description={`Harga per bulan, dipakai untuk mengisi nominal otomatis saat mencatat penjualan. ${isOwner ? "" : "Hanya owner yang bisa mengubah."}`}
      />
      {error && <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {savedName && (
        <p className="mb-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          Promo {savedName} tersimpan dan sudah tampil di aplikasi.
        </p>
      )}
      <Card>
        <CardContent className="divide-y p-0">
          {(plans ?? []).map((p) => {
            const price = Number(p.monthly_price_idr);
            const promo = promoPrice(price, p.promo_price_idr, p.promo_until);
            const gm = guaranteedMargin(promo ?? price, Number(p.monthly_credits));
            return (
              <div key={p.id} id={`promo-plan-${p.id}`} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {PLAN_NAME[p.id] ?? p.name}
                      {promo !== null && <PromoBadge label={p.promo_label} />}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <PriceLine price={price} promo={promo} until={p.promo_until} />
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
                  <PromoForm
                    row={p}
                    active={promo !== null}
                    save={updatePlanPromo.bind(null, p.id)}
                    stop={clearPlanPromo.bind(null, p.id)}
                    placeholder="mis. 149000"
                    note={
                      gm !== null && (
                        <span className={gm < TARGET_MARGIN ? "font-medium text-destructive" : ""}>
                          Laba minimum per akun di harga {promo !== null ? "promo" : "ini"}: {Math.round(gm * 100)}%
                          {gm < TARGET_MARGIN && `, di bawah target ${Math.round(TARGET_MARGIN * 100)}%: kurangi kredit atau naikkan harga promo`}
                        </span>
                      )
                    }
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Mengubah harga tidak mengubah penjualan yang sudah tercatat. Harga promo langsung tampil (harga normal dicoret) di aplikasi AI, dan otomatis
        berhenti setelah tanggal akhirnya.
      </p>

      <h2 className="mt-8 mb-1 text-lg font-semibold">Add-on Smart Tools</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Dijual terpisah untuk user yang paketnya belum membuka Smart Tools (mis. Free): satu kelompok tool, aktif 30 hari per pembelian. Tawaran
        tampil di halaman Smart Tools & halaman tool yang terkunci. Pengaman laba otomatis: biaya AI tiap pembelian dibatasi 70% dari uang yang
        dibayar, jadi laba minimal 30% walau semua hasil dipakai.
      </p>
      <Card>
        <CardContent className="divide-y p-0">
          {(addons ?? []).map((a) => {
            const price = Number(a.price_idr);
            const promo = promoPrice(price, a.promo_price_idr, a.promo_until);
            return (
              <div key={a.id} id={`promo-addon-${a.id}`} className="space-y-3 p-4">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {a.name}
                    {promo !== null && <PromoBadge label={a.promo_label} />}
                    {!a.is_active && <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">tidak dijual</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.tagline}</p>
                  <p className="text-sm text-muted-foreground">
                    <PriceLine price={price} promo={promo} until={a.promo_until} /> · {a.monthly_quota} hasil/bulan
                  </p>
                </div>
                {isOwner && (
                  <form action={updateAddon.bind(null, a.id)} className="flex flex-wrap items-end gap-2">
                    <label className="space-y-1 text-xs text-muted-foreground">
                      Harga normal/bulan (Rp)
                      <Input name="price" inputMode="numeric" defaultValue={a.price_idr} className="w-36" />
                    </label>
                    <label className="space-y-1 text-xs text-muted-foreground">
                      Hasil/bulan
                      <Input name="monthly_quota" inputMode="numeric" defaultValue={a.monthly_quota} className="w-24" />
                    </label>
                    <input type="hidden" name="promax_quota" value={a.promax_quota} />
                    <input type="hidden" name="trial_quota" value={a.trial_quota} />
                    <Button type="submit" size="sm" variant="outline">Simpan</Button>
                  </form>
                )}
                {isOwner && price > 0 && (
                  <PromoForm
                    row={a}
                    active={promo !== null}
                    save={updateAddonPromo.bind(null, a.id)}
                    stop={clearAddonPromo.bind(null, a.id)}
                    placeholder="mis. 35000"
                    note="Laba tetap minimal 30% di harga promo (batas biaya AI ikut uang yang dibayar)."
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
