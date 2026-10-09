import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COST_CATEGORY, PLAN_NAME, USD_IDR, idr, num, usd } from "@/lib/admin-format";
import { DailyBars, HBarList } from "@/components/backoffice/charts";
import { SectionTitle, Stat } from "@/components/backoffice/stat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Biaya AI & margin" };

const RANGES = [7, 30, 90] as const;

export default async function BackofficeCostsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: raw } = await searchParams;
  const days = RANGES.includes(Number(raw) as (typeof RANGES)[number]) ? Number(raw) : 30;
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [breakdown, daily, models, top, plans, revenue] = await Promise.all([
    admin.rpc("admin_cost_breakdown", { p_days: days }),
    admin.rpc("admin_daily_series", { p_days: days }),
    admin.rpc("admin_usage_by_model", { p_days: days }),
    admin.rpc("admin_top_users", { p_days: days, p_limit: 15 }),
    admin.rpc("admin_plan_breakdown", { p_days: days }),
    admin.from("subscriptions").select("amount_idr").is("refunded_at", null).gte("paid_at", since),
  ]);
  const cats = (breakdown.data ?? []) as { category: string; events: number; cost_usd: number }[];
  const series = (daily.data ?? []) as { day: string; cost_usd: number; messages: number }[];
  const modelRows = (models.data ?? []) as { provider: string; model: string; messages: number; est_cost_usd: number }[];
  const topUsers = (top.data ?? []) as { user_id: string; email: string; plan_id: string; messages: number; images: number; cost_usd: number; last_active: string }[];
  const planRows = (plans.data ?? []) as { plan_id: string; plan_name: string; active_users: number; cost_usd: number }[];

  const total = cats.reduce((a, c) => a + Number(c.cost_usd), 0);
  const messages = series.reduce((a, d) => a + Number(d.messages), 0);
  const perDay = total / days;
  const revenueIdr = (revenue.data ?? []).reduce((a, r) => a + Number(r.amount_idr), 0);
  const costIdr = total * USD_IDR;
  const margin = revenueIdr - costIdr;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Periode:</span>
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`?days=${r}`}
            className={`rounded-full border px-3 py-1 text-sm ${r === days ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent"}`}
          >
            {r} hari
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={`Pendapatan (${days} hari)`} value={`Rp${num(revenueIdr)}`} sub="dari penjualan tercatat" />
        <Stat label={`Biaya AI (${days} hari)`} value={idr(total)} sub="estimasi tagihan penyedia AI" />
        <Stat
          label="Margin kasar"
          value={`${margin < 0 ? "-" : ""}Rp${num(Math.abs(Math.round(margin)))}`}
          sub={revenueIdr > 0 ? `${Math.round((margin / revenueIdr) * 100)}% dari pendapatan` : "belum ada pendapatan tercatat"}
          tone={margin < 0 ? "warn" : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={`Total biaya AI (${days} hari)`} value={idr(total)} sub={usd(total)} />
        <Stat label="Rata-rata per hari" value={idr(perDay)} sub={`proyeksi 30 hari ${idr(perDay * 30)}`} />
        <Stat label="Biaya per chat" value={idr(messages ? total / messages : 0)} sub={`${num(messages)} chat`} />
        <Stat label="Kurs yang dipakai" value={`Rp${num(USD_IDR)}`} sub="per $1 (perkiraan, ubah via env USD_IDR_RATE)" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Biaya AI per hari</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyBars label="Biaya AI per hari" data={series.map((d) => ({ day: d.day, value: Number(d.cost_usd) }))} format={idr} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Biaya per fitur</CardTitle>
          </CardHeader>
          <CardContent>
            <HBarList
              items={cats.map((c) => ({
                label: COST_CATEGORY[c.category] ?? c.category,
                value: Number(c.cost_usd),
                sub: `${num(c.events)}× · ${total > 0 ? Math.round((Number(c.cost_usd) / total) * 100) : 0}%`,
              }))}
              format={idr}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Biaya per paket</CardTitle>
          </CardHeader>
          <CardContent>
            <HBarList
              items={planRows.map((p) => ({
                label: PLAN_NAME[p.plan_id] ?? p.plan_name,
                value: Number(p.cost_usd),
                sub: `${num(p.active_users)} user aktif`,
              }))}
              format={idr}
            />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionTitle hint="Untuk deteksi pemakaian berlebihan / penyalahgunaan">User dengan biaya terbesar</SectionTitle>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">User</th>
                <th className="p-2">Paket</th>
                <th className="p-2 text-right">Chat</th>
                <th className="p-2 text-right">Gambar</th>
                <th className="p-2 text-right">Biaya</th>
                <th className="p-2">Terakhir aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {topUsers.map((u) => (
                <tr key={u.user_id}>
                  <td className="p-2">
                    <Link href={`/backoffice/customers/${u.user_id}`} className="font-medium hover:underline">{u.email}</Link>
                  </td>
                  <td className="p-2">{PLAN_NAME[u.plan_id] ?? u.plan_id}</td>
                  <td className="p-2 text-right">{num(u.messages)}</td>
                  <td className="p-2 text-right">{num(u.images)}</td>
                  <td className="p-2 text-right font-medium">{idr(u.cost_usd)}</td>
                  <td className="p-2 text-xs">{new Date(u.last_active).toLocaleString("id-ID")}</td>
                </tr>
              ))}
              {!topUsers.length && (
                <tr>
                  <td colSpan={6} className="p-4 text-muted-foreground">Belum ada data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Model AI yang menjawab</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Model</th>
                <th className="text-right">Permintaan</th>
                <th className="text-right">Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {modelRows.map((m) => (
                <tr key={`${m.provider}:${m.model}`}>
                  <td className="py-2 font-mono text-xs">{m.provider}:{m.model}</td>
                  <td className="text-right">{num(m.messages)}</td>
                  <td className="text-right">{idr(m.est_cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Google (Gemini) = paket Free gratisan, tercatat Rp0. Biaya Claude & OpenRouter adalah estimasi dari harga resmi; tagihan
            asli lihat di konsol masing-masing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
