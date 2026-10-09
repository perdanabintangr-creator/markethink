import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaleForm } from "@/components/backoffice/sale-form";
import { SectionTitle } from "@/components/backoffice/stat";
import { PLAN_NAME, num } from "@/lib/admin-format";
import { SALE_KIND, dateID, rupiah } from "@/lib/backoffice-format";
import { updatePlanPrice } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Penjualan" };

interface MonthRow {
  month: string;
  signups: number;
  revenue: number;
  sales: number;
  new_paid: number;
  renewals: number;
  upgrades: number;
  churn: number;
}

const monthName = (m: string) => new Date(`${m}T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

/** Batas bulan dalam WIB → ISO UTC. */
function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, -7));
  const end = new Date(Date.UTC(y, m, 1, -7));
  return [start.toISOString(), end.toISOString()] as const;
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { isAdmin } = await requireBackoffice();
  const sp = await searchParams;
  const nowWib = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : nowWib;
  const [from, to] = monthRange(month);

  const admin = createAdminClient();
  const [{ data: monthly }, { data: plans }, { data: sales }] = await Promise.all([
    admin.rpc("bo_monthly", { p_months: 12 }),
    admin.from("plans").select("id, name, monthly_price_idr, sort_order").order("sort_order"),
    admin
      .from("subscriptions")
      .select("id, user_id, plan_id, kind, amount_idr, months, payment_method, note, paid_at, refunded_at, current_period_end, customer:profiles!subscriptions_user_id_fkey(email, full_name), creator:profiles!subscriptions_created_by_fkey(email)")
      .gte("paid_at", from)
      .lt("paid_at", to)
      .order("paid_at", { ascending: false })
      .limit(1000),
  ]);
  const months = ((monthly ?? []) as MonthRow[]).slice().reverse();
  const prices = Object.fromEntries((plans ?? []).map((p) => [p.id, Number(p.monthly_price_idr)]));
  const rows = sales ?? [];
  const total = rows.filter((s) => !s.refunded_at).reduce((a, s) => a + Number(s.amount_idr), 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Catat penjualan baru</CardTitle>
            <p className="text-xs text-muted-foreground">
              Setelah pelanggan transfer/bayar, catat di sini — paketnya langsung aktif dan masuk laporan. Pelanggan harus sudah punya akun Markethink.
            </p>
          </CardHeader>
          <CardContent>
            <SaleForm prices={prices} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Harga paket per bulan</CardTitle>
            <p className="text-xs text-muted-foreground">Dipakai untuk mengisi nominal otomatis. {isAdmin ? "" : "Hanya admin yang bisa mengubah."}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(plans ?? [])
              .filter((p) => p.id !== "beta")
              .map((p) =>
                isAdmin ? (
                  <form key={p.id} action={updatePlanPrice.bind(null, p.id)} className="flex items-center gap-2">
                    <span className="w-20 text-sm font-medium">{PLAN_NAME[p.id] ?? p.name}</span>
                    <span className="text-sm text-muted-foreground">Rp</span>
                    <Input name="price" inputMode="numeric" defaultValue={p.monthly_price_idr} className="w-36" />
                    <Button type="submit" size="sm" variant="outline">Simpan</Button>
                  </form>
                ) : (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span>{PLAN_NAME[p.id] ?? p.name}</span>
                    <span className="tabular-nums">{p.monthly_price_idr ? rupiah(p.monthly_price_idr) : "belum diatur"}</span>
                  </div>
                ),
              )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionTitle hint="Klik nama bulan untuk melihat transaksinya">Laporan bulanan (12 bulan)</SectionTitle>
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2.5">Bulan</th>
                <th className="p-2.5 text-right">Pendapatan</th>
                <th className="p-2.5 text-right">Transaksi</th>
                <th className="p-2.5 text-right">Pelanggan baru</th>
                <th className="p-2.5 text-right">Perpanjang</th>
                <th className="p-2.5 text-right">Upgrade</th>
                <th className="p-2.5 text-right">Berhenti</th>
                <th className="p-2.5 text-right">Pendaftar akun</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {months.map((m) => (
                <tr key={m.month} className={m.month.slice(0, 7) === month ? "bg-primary/5" : ""}>
                  <td className="p-2.5">
                    <Link href={`?month=${m.month.slice(0, 7)}`} className="font-medium hover:underline">{monthName(m.month)}</Link>
                  </td>
                  <td className="p-2.5 text-right font-medium">{rupiah(m.revenue)}</td>
                  <td className="p-2.5 text-right">{num(m.sales)}</td>
                  <td className="p-2.5 text-right">{num(m.new_paid)}</td>
                  <td className="p-2.5 text-right">{num(m.renewals)}</td>
                  <td className="p-2.5 text-right">{num(m.upgrades)}</td>
                  <td className="p-2.5 text-right">{num(m.churn)}</td>
                  <td className="p-2.5 text-right">{num(m.signups)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Akun admin & tim back office tidak dihitung. Penjualan yang dibatalkan tidak masuk pendapatan.</p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>Transaksi {monthName(`${month}-01`)}</SectionTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm">Total: <b className="tabular-nums">{rupiah(total)}</b></span>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/backoffice/export?type=sales&month=${month}`}>Unduh Excel (CSV)</a>
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2.5">Tanggal</th>
                <th className="p-2.5">Pelanggan</th>
                <th className="p-2.5">Paket</th>
                <th className="p-2.5">Jenis</th>
                <th className="p-2.5">Metode</th>
                <th className="p-2.5">Aktif sampai</th>
                <th className="p-2.5 text-right">Nominal</th>
                <th className="p-2.5">Dicatat oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((s) => {
                const c = s.customer as unknown as { email: string | null; full_name: string | null } | null;
                const by = s.creator as unknown as { email: string | null } | null;
                return (
                  <tr key={s.id} className={s.refunded_at ? "text-muted-foreground line-through" : ""}>
                    <td className="p-2.5 text-xs">{dateID(s.paid_at)}</td>
                    <td className="p-2.5">
                      <Link href={`/backoffice/customers/${s.user_id}`} className="font-medium hover:underline">{c?.email ?? "-"}</Link>
                      {s.note && <div className="text-xs text-muted-foreground">{s.note}</div>}
                    </td>
                    <td className="p-2.5">{PLAN_NAME[s.plan_id] ?? s.plan_id} · {s.months} bln</td>
                    <td className="p-2.5">{SALE_KIND[s.kind] ?? s.kind}</td>
                    <td className="p-2.5">{s.payment_method ?? "-"}</td>
                    <td className="p-2.5 text-xs">{dateID(s.current_period_end)}</td>
                    <td className="p-2.5 text-right tabular-nums">{rupiah(s.amount_idr)}</td>
                    <td className="p-2.5 text-xs">{by?.email ?? "-"}</td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">Belum ada transaksi di bulan ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
