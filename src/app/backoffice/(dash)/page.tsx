import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { LogoMark } from "@/components/logo";
import { LogoutButton } from "@/components/backoffice/logout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyBars, Funnel, HBarList, monthLabel } from "@/components/backoffice/charts";
import { SectionTitle, Stat } from "@/components/backoffice/stat";
import { PLAN_NAME, num, pct } from "@/lib/admin-format";
import { SALE_KIND, dateID, rupiah } from "@/lib/backoffice-format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

type Overview = Record<string, number>;
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
interface PlanMix {
  plan_id: string;
  plan_name: string;
  monthly_price_idr: number;
  customers: number;
  active_subs: number;
  mrr_idr: number;
}

function change(now: number, before: number) {
  if (!before) return now ? "naik dari 0 bulan lalu" : "sama dengan bulan lalu";
  const p = Math.round(((now - before) / before) * 100);
  return `${p >= 0 ? "▲" : "▼"} ${Math.abs(p)}% vs bulan lalu`;
}

export default async function BackofficeOverview() {
  const { user } = await requireBackoffice();
  const admin = createAdminClient();
  const [ov, monthly, mix, funnel, recent] = await Promise.all([
    admin.rpc("bo_overview").single<Overview>(),
    admin.rpc("bo_monthly", { p_months: 12 }),
    admin.rpc("bo_plan_mix"),
    admin.rpc("admin_funnel").single<Overview>(),
    admin
      .from("subscriptions")
      .select("id, user_id, plan_id, amount_idr, months, kind, paid_at, refunded_at, profiles!subscriptions_user_id_fkey(email, full_name)")
      .is("refunded_at", null)
      .order("paid_at", { ascending: false })
      .limit(6),
  ]);
  const k = ov.data ?? {};
  const months = (monthly.data ?? []) as MonthRow[];
  const plans = (mix.data ?? []) as PlanMix[];
  const f = funnel.data ?? {};
  const sales = recent.data ?? [];
  const v = (key: string) => Number(k[key] ?? 0);

  const followUps = [
    { n: v("expiring_7d"), label: "langganan habis ≤ 7 hari", href: "/backoffice/customers?status=expiring", hint: "ingatkan untuk perpanjang" },
    { n: v("overdue"), label: "langganan sudah lewat masa aktif", href: "/backoffice/customers?status=overdue", hint: "tagih atau turunkan ke Free" },
    { n: v("paid_without_record"), label: "user berbayar tanpa catatan pembayaran", href: "/backoffice/customers?status=no_record", hint: "catat penjualannya" },
    { n: v("waitlist"), label: "calon pelanggan di waitlist", href: "/backoffice/leads", hint: `${num(v("waitlist_this_month"))} baru bulan ini` },
  ];

  const initials = user.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground text-base font-semibold text-background">{initials}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Selamat datang</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.full_name} · {user.role === "owner" ? "Owner" : "Tim"}
              </p>
            </div>
            <LogoutButton />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <LogoMark className="size-12" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Markethink AI</p>
              <p className="text-sm text-muted-foreground">{today}</p>
            </div>
            <a href="/chat" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium hover:underline">
              Buka aplikasi <ExternalLink className="size-4" />
            </a>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionTitle hint="Pelanggan = semua akun selain admin aplikasi">Database pelanggan</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total akun terdaftar" value={num(v("total_accounts"))} sub={`${num(v("customers"))} pelanggan · ${num(v("internal_accounts"))} tim internal`} />
          <Stat
            label="Pelanggan berbayar"
            value={num(v("paying_users"))}
            sub={`${num(v("free_users"))} masih Free · konversi ${pct(v("paying_users"), v("customers"))}`}
          />
          <Stat label="Pendaftar baru bulan ini" value={num(v("new_this_month"))} sub={`${num(v("new_today"))} hari ini · ${change(v("new_this_month"), v("new_last_month"))}`} />
          <Stat label="Aktif 30 hari terakhir" value={num(v("active_30d"))} sub={`${pct(v("active_30d"), v("customers"))} dari pelanggan`} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle hint={<Link href="/backoffice/sales/new" className="underline">Catat penjualan →</Link>}>Penjualan</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Pendapatan bulan ini" value={rupiah(v("revenue_this_month"))} sub={change(v("revenue_this_month"), v("revenue_last_month"))} />
          <Stat label="MRR (pendapatan rutin / bulan)" value={rupiah(v("mrr_idr"))} sub="dari langganan yang sedang aktif" />
          <Stat
            label="Transaksi bulan ini"
            value={num(v("sales_this_month"))}
            sub={`${num(v("new_paid_this_month"))} baru · ${num(v("renewals_this_month"))} perpanjang · ${num(v("upgrades_this_month"))} upgrade`}
          />
          <Stat
            label="Berhenti langganan bulan ini"
            value={num(v("churn_this_month"))}
            sub={`total pendapatan sejak awal ${rupiah(v("revenue_total"))}`}
            tone={v("churn_this_month") > 0 ? "warn" : undefined}
          />
        </div>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Perlu ditindaklanjuti</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {followUps.map((x) => (
              <li key={x.href}>
                <Link href={x.href} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
                  <span className={`min-w-10 text-center text-xl font-semibold tabular-nums ${x.n > 0 ? "text-primary" : "text-muted-foreground"}`}>{num(x.n)}</span>
                  <span className="text-sm">
                    {x.label}
                    <span className="block text-xs text-muted-foreground">{x.hint} →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
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
            <CardTitle className="text-base">Pendaftar baru per bulan</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyBars label="Pendaftar baru per bulan" data={months.map((m) => ({ day: m.month, value: Number(m.signups) }))} dateLabel={monthLabel} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pelanggan per paket</CardTitle>
          </CardHeader>
          <CardContent>
            <HBarList
              items={plans.map((p) => ({
                label: PLAN_NAME[p.plan_id] ?? p.plan_name,
                value: Number(p.customers),
                sub: pct(Number(p.customers), v("customers")),
              }))}
            />
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5">Paket</th>
                  <th className="text-right">Harga / bln</th>
                  <th className="text-right">Langganan aktif</th>
                  <th className="text-right">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {plans.map((p) => (
                  <tr key={p.plan_id}>
                    <td className="py-1.5">{PLAN_NAME[p.plan_id] ?? p.plan_name}</td>
                    <td className="text-right">{p.plan_id === "beta" ? "Gratis" : Number(p.monthly_price_idr) ? rupiah(p.monthly_price_idr) : "belum diatur"}</td>
                    <td className="text-right">{p.plan_id === "beta" ? "-" : num(p.active_subs)}</td>
                    <td className="text-right">{p.plan_id === "beta" ? "-" : rupiah(p.mrr_idr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Perjalanan pelanggan (semua waktu)</CardTitle>
          </CardHeader>
          <CardContent>
            <Funnel
              steps={[
                { label: "Daftar akun", value: Number(f.signups ?? 0) },
                { label: "Selesai isi profil (onboarding)", value: Number(f.onboarded ?? 0) },
                { label: "Mulai chat dengan AI", value: Number(f.first_message ?? 0) },
                { label: "Aktif ≥ 3 hari berbeda", value: Number(f.active_3_days ?? 0) },
                { label: "Berlangganan (Pro/Promax)", value: Number(f.paying ?? 0) },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Penjualan terbaru</CardTitle>
          <Link href="/backoffice/sales" className="text-xs text-muted-foreground underline">semua penjualan →</Link>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Tanggal</th>
                <th>Pelanggan</th>
                <th>Paket</th>
                <th>Jenis</th>
                <th className="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.map((s) => {
                const p = s.profiles as unknown as { email: string | null; full_name: string | null } | null;
                return (
                  <tr key={s.id}>
                    <td className="py-2 text-xs">{dateID(s.paid_at)}</td>
                    <td>
                      <Link href={`/backoffice/customers/${s.user_id}`} className="font-medium hover:underline">{p?.email ?? "-"}</Link>
                    </td>
                    <td>{PLAN_NAME[s.plan_id] ?? s.plan_id} · {s.months} bln</td>
                    <td>{SALE_KIND[s.kind] ?? s.kind}</td>
                    <td className="text-right tabular-nums">{rupiah(s.amount_idr)}</td>
                  </tr>
                );
              })}
              {!sales.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    Belum ada penjualan tercatat. Saat ada pelanggan bayar, catat di menu <Link href="/backoffice/sales/new" className="underline">Catat penjualan</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
