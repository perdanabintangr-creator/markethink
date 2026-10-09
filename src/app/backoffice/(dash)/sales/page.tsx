import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/backoffice/stat";
import { PLAN_NAME } from "@/lib/admin-format";
import { SALE_KIND, dateID, rupiah } from "@/lib/backoffice-format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transaksi" };

const monthName = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

/** Batas bulan dalam WIB → ISO UTC. */
function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return [new Date(Date.UTC(y, m - 1, 1, -7)).toISOString(), new Date(Date.UTC(y, m, 1, -7)).toISOString()] as const;
}
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const current = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : current;
  const [from, to] = monthRange(month);

  const { data } = await createAdminClient()
    .from("subscriptions")
    .select("id, user_id, plan_id, kind, amount_idr, months, payment_method, note, paid_at, refunded_at, current_period_end, customer:profiles!subscriptions_user_id_fkey(email, full_name), recorder:backoffice_users!subscriptions_bo_created_by_fkey(full_name)")
    .gte("paid_at", from)
    .lt("paid_at", to)
    .order("paid_at", { ascending: false })
    .limit(1000);
  const rows = data ?? [];
  const valid = rows.filter((s) => !s.refunded_at);
  const total = valid.reduce((a, s) => a + Number(s.amount_idr), 0);

  return (
    <div className="space-y-4">
      <PageTitle
        title="Transaksi"
        description={`${monthName(month)} · ${valid.length} transaksi · total ${rupiah(total)}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`?month=${shiftMonth(month, -1)}`}>← Bulan sebelumnya</Link>
            </Button>
            {month < current && (
              <Button asChild variant="outline" size="sm">
                <Link href={`?month=${shiftMonth(month, 1)}`}>Bulan berikutnya →</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <a href={`/api/backoffice/export?type=sales&month=${month}`}>Unduh Excel (CSV)</a>
            </Button>
            <Button asChild size="sm">
              <Link href="/backoffice/sales/new">+ Catat penjualan</Link>
            </Button>
          </>
        }
      />
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
              const by = s.recorder as unknown as { full_name: string } | null;
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
                  <td className="p-2.5 text-xs">{by?.full_name ?? "-"}</td>
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
    </div>
  );
}
