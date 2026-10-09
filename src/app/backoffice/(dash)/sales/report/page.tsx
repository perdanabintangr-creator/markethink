import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyBars, monthLabel } from "@/components/backoffice/charts";
import { PageTitle } from "@/components/backoffice/stat";
import { num } from "@/lib/admin-format";
import { rupiah } from "@/lib/backoffice-format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Laporan bulanan" };

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

export default async function ReportPage() {
  const { data } = await createAdminClient().rpc("bo_monthly", { p_months: 12 });
  const months = (data ?? []) as MonthRow[];
  const totalRevenue = months.reduce((a, m) => a + Number(m.revenue), 0);
  return (
    <div className="space-y-6">
      <PageTitle title="Laporan bulanan" description={`12 bulan terakhir · total pendapatan ${rupiah(totalRevenue)}. Akun admin aplikasi tidak dihitung; penjualan yang dibatalkan tidak masuk.`} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pendapatan per bulan</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyBars label="Pendapatan per bulan" data={months.map((m) => ({ day: m.month, value: Number(m.revenue) }))} format={rupiah} dateLabel={monthLabel} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pendaftar akun per bulan</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyBars label="Pendaftar akun per bulan" data={months.map((m) => ({ day: m.month, value: Number(m.signups) }))} dateLabel={monthLabel} />
          </CardContent>
        </Card>
      </div>
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
            {months
              .slice()
              .reverse()
              .map((m) => (
                <tr key={m.month}>
                  <td className="p-2.5">
                    <Link href={`/backoffice/sales?month=${m.month.slice(0, 7)}`} className="font-medium hover:underline">{monthName(m.month)}</Link>
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
    </div>
  );
}
