import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle, SectionTitle, Stat } from "@/components/backoffice/stat";
import { PLAN_NAME, USD_IDR, num } from "@/lib/admin-format";
import { dateID, rupiah } from "@/lib/backoffice-format";
import { activePromo, effectivePrice } from "@/lib/promo";
import {
  IDR_PER_CREDIT,
  PNL_STATUS,
  TARGET_MARGIN,
  accountRisks,
  guaranteedMargin,
  marginPct,
  maxSafeCredits,
  pnlStatus,
  type PnlStatus,
} from "@/lib/profit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Laba rugi per akun" };

const RANGES: Record<string, { label: string; days: number | null }> = {
  "30": { label: "30 hari", days: 30 },
  "90": { label: "90 hari", days: 90 },
  "365": { label: "1 tahun", days: 365 },
  all: { label: "Sepanjang waktu", days: null },
};
const SORT: Record<string, string> = {
  worst: "Paling rugi dulu",
  best: "Paling untung dulu",
  cost: "Biaya AI terbesar",
  revenue: "Pendapatan terbesar",
};
const FILTER: Record<string, string> = {
  all: "Semua akun",
  loss: "Rugi",
  thin: "Untung tipis",
  profit: "Untung",
  great: "Sangat untung",
  idle: "Tanpa aktivitas",
  risk: "Perlu tindakan",
  paid: "Paket berbayar",
  free: "Free",
};
const SHOW = 200;

interface Row {
  id: string;
  email: string | null;
  full_name: string | null;
  plan_id: string;
  internal: boolean;
  banned: boolean;
  created_at: string;
  last_active_at: string | null;
  revenue_idr: number;
  cost_usd: number;
  events: number;
  credits_spent: number;
  month_limit: number | null;
  month_used: number | null;
  plan_credits: number;
  credit_override: number | null;
  bonus_credits: number;
  plan_price_idr: number;
  active_until: string | null;
}

const signed = (v: number) => `${v < 0 ? "-" : ""}${rupiah(Math.abs(v))}`;

const TONE: Record<PnlStatus, string> = {
  loss: "border-destructive/40 bg-destructive/10 text-destructive",
  thin: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  profit: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  great: "border-emerald-600/50 bg-emerald-600/15 font-semibold text-emerald-700 dark:text-emerald-300",
  idle: "text-muted-foreground",
};

export default async function ProfitPage({ searchParams }: { searchParams: Promise<{ range?: string; sort?: string; show?: string }> }) {
  const sp = await searchParams;
  const range = sp.range && sp.range in RANGES ? sp.range : "30";
  const sort = sp.sort && sp.sort in SORT ? sp.sort : "worst";
  const show = sp.show && sp.show in FILTER ? sp.show : "all";
  const admin = createAdminClient();
  const [{ data, error }, { data: plans }] = await Promise.all([
    admin.rpc("bo_account_pnl", { p_days: RANGES[range].days }),
    admin.from("plans").select("id, name, monthly_price_idr, monthly_credits, promo_price_idr, promo_until, is_active, sort_order").order("sort_order"),
  ]);

  const priceNow = Object.fromEntries((plans ?? []).map((p) => [p.id, effectivePrice(p)]));
  const all = ((data ?? []) as Row[]).map((r) => {
    const revenue = Number(r.revenue_idr);
    const cost = Number(r.cost_usd) * USD_IDR;
    const acc = { ...r, plan_price_idr: priceNow[r.plan_id] ?? Number(r.plan_price_idr), revenue, cost, profit: revenue - cost, credits_spent: Number(r.credits_spent), bonus_credits: Number(r.bonus_credits) };
    return { ...acc, status: pnlStatus(revenue, cost), risks: accountRisks(acc) };
  });
  const customers = all.filter((r) => !r.internal);
  const internal = all.filter((r) => r.internal);

  const sum = (rows: typeof all, f: (r: (typeof all)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const revenue = sum(customers, (r) => r.revenue);
  const cost = sum(customers, (r) => r.cost);
  const paidRows = customers.filter((r) => r.plan_id !== "beta" || r.revenue > 0);
  const freeRows = customers.filter((r) => r.plan_id === "beta" && r.revenue <= 0);
  const freeCost = sum(freeRows, (r) => r.cost);
  const paidProfit = sum(paidRows, (r) => r.profit);
  const internalCost = sum(internal, (r) => r.cost);
  const count = (s: PnlStatus) => customers.filter((r) => r.status === s).length;
  const lossPaid = paidRows.filter((r) => r.status === "loss");
  const risky = customers.filter((r) => r.risks.length > 0);

  // Biaya nyata per kredit: kalau > Rp100, potongan kredit kurang dari biaya sebenarnya → pengaman bocor.
  const creditsSpent = sum(customers, (r) => r.credits_spent);
  const idrPerCredit = creditsSpent > 0 ? cost / creditsSpent : null;

  let rows = customers.filter((r) => {
    if (show === "all") return true;
    if (show === "risk") return r.risks.length > 0;
    if (show === "paid") return r.plan_id !== "beta" || r.revenue > 0;
    if (show === "free") return r.plan_id === "beta" && r.revenue <= 0;
    return r.status === show;
  });
  rows = rows.sort((a, b) =>
    sort === "best" ? b.profit - a.profit : sort === "cost" ? b.cost - a.cost : sort === "revenue" ? b.revenue - a.revenue : a.profit - b.profit,
  );
  const total = rows.length;
  rows = rows.slice(0, SHOW);
  const qs = (p: Record<string, string>) => `?${new URLSearchParams({ range, sort, show, ...p })}`;
  const target = Math.round(TARGET_MARGIN * 100);

  return (
    <div className="space-y-8">
      <div>
        <PageTitle
          title="Laba rugi per akun"
          description="Pendapatan tiap akun (paket + add-on, dihitung per hari masa aktifnya) dikurangi biaya AI nyata yang dipakai akun itu."
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Periode:</span>
          {Object.entries(RANGES).map(([k, v]) => (
            <Link
              key={k}
              href={qs({ range: k })}
              className={`rounded-full border px-3 py-1 text-sm ${k === range ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent"}`}
            >
              {v.label}
            </Link>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-destructive">Gagal memuat data: {error.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pendapatan diakui" value={rupiah(revenue)} sub={`${RANGES[range].label}, akun pelanggan`} />
        <Stat label="Biaya AI pelanggan" value={rupiah(cost)} sub={`kurs Rp${num(USD_IDR)}/$1`} />
        <Stat
          label="Laba kotor"
          value={signed(revenue - cost)}
          sub={revenue > 0 ? `margin ${marginPct(revenue, cost)}%` : "belum ada pendapatan"}
          tone={revenue - cost < 0 ? "warn" : undefined}
        />
        <Stat
          label="Laba dari akun berbayar"
          value={signed(paidProfit)}
          sub={`${num(paidRows.length)} akun · ${num(lossPaid.length)} rugi`}
          tone={paidProfit < 0 ? "warn" : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {(["great", "profit", "thin", "loss", "idle"] as PnlStatus[]).map((s) => (
          <Link key={s} href={qs({ show: s })} className="rounded-xl border bg-background p-3 hover:bg-accent">
            <p className={`inline-block rounded-full border px-2 py-0.5 text-xs ${TONE[s]}`}>{PNL_STATUS[s].label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{num(count(s))}</p>
            <p className="text-xs text-muted-foreground">{PNL_STATUS[s].hint}</p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pengaman laba: semua akun dijaga tetap untung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Setiap pemakaian AI memotong kredit sesuai biaya nyatanya (1 kredit ≈ Rp{IDR_PER_CREDIT}). Jadi biaya AI maksimum satu akun per bulan =
            jatah kredit × Rp{IDR_PER_CREDIT}. Selama jatah kredit paket di bawah batas aman, akun berbayar <b>tidak bisa</b> merugikan, sehabis-habisnya
            dipakai. Target margin minimum: <b>{target}%</b>.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Paket</th>
                  <th className="text-right">Harga/bln</th>
                  <th className="text-right">Kredit/bln</th>
                  <th className="text-right">Biaya AI maks</th>
                  <th className="text-right">Laba minimum</th>
                  <th className="text-right">Batas aman kredit</th>
                  <th className="pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {(plans ?? [])
                  .filter((p) => p.is_active)
                  .map((p) => {
                    const promo = activePromo(p);
                    const price = promo ?? Number(p.monthly_price_idr);
                    const credits = Number(p.monthly_credits);
                    const maxCost = credits * IDR_PER_CREDIT;
                    const gm = guaranteedMargin(price, credits);
                    const safe = maxSafeCredits(price);
                    const ok = gm !== null && gm >= TARGET_MARGIN;
                    return (
                      <tr key={p.id}>
                        <td className="py-2 font-medium">
                          {PLAN_NAME[p.id] ?? p.name}
                          {promo !== null && <span className="ml-1 text-xs font-normal text-destructive">(harga promo)</span>}
                        </td>
                        <td className="text-right">{rupiah(price)}</td>
                        <td className="text-right">{num(credits)}</td>
                        <td className="text-right">{rupiah(maxCost)}</td>
                        <td className="text-right">{signed(price - maxCost)}</td>
                        <td className="text-right">{price > 0 ? num(safe) : "-"}</td>
                        <td className="pl-3 text-xs">
                          {gm === null ? (
                            <span className="text-muted-foreground">Gratis: biaya promosi maks {rupiah(maxCost)}/akun/bln</span>
                          ) : ok ? (
                            <span className="text-emerald-700 dark:text-emerald-400">✓ Aman (margin min {Math.round(gm * 100)}%)</span>
                          ) : (
                            <span className="font-medium text-destructive">⚠ Bisa rugi/tipis (margin min {Math.round(gm * 100)}%)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Biaya nyata per kredit ({RANGES[range].label})</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${idrPerCredit !== null && idrPerCredit > IDR_PER_CREDIT ? "text-destructive" : ""}`}>
                {idrPerCredit === null ? "-" : `Rp${num(Math.round(idrPerCredit))}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {idrPerCredit === null
                  ? "belum ada pemakaian"
                  : idrPerCredit > IDR_PER_CREDIT
                    ? `⚠ di atas Rp${IDR_PER_CREDIT}: potongan kredit lebih murah dari biaya asli`
                    : `✓ di bawah Rp${IDR_PER_CREDIT}, potongan kredit menutup biaya`}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Biaya akun Free (promosi)</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{rupiah(freeCost)}</p>
              <p className="text-xs text-muted-foreground">
                {num(freeRows.filter((r) => r.cost > 0).length)} akun Free aktif · rata-rata{" "}
                {rupiah(freeRows.filter((r) => r.cost > 0).length ? freeCost / freeRows.filter((r) => r.cost > 0).length : 0)}/akun
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Biaya akun internal (admin/tim)</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{rupiah(internalCost)}</p>
              <p className="text-xs text-muted-foreground">tidak dihitung di laba pelanggan</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ubah jatah kredit paket di{" "}
            <Link href="/settings" className="underline">Pengaturan aplikasi</Link>, harga di{" "}
            <Link href="/sales/prices" className="underline">Harga paket</Link>. Kebocoran yang bisa membuat akun rugi: kuota khusus terlalu besar, bonus
            kredit, dan paket berbayar yang belum/tidak lagi dibayar — semuanya muncul di filter <b>Perlu tindakan</b>.
          </p>
        </CardContent>
      </Card>

      {risky.length > 0 && (
        <section className="space-y-3">
          <SectionTitle hint="Klik akun untuk memperbaiki di halaman detail pelanggan">
            Perlu tindakan ({num(risky.length)})
          </SectionTitle>
          <div className="divide-y rounded-xl border bg-background">
            {risky.slice(0, 20).map((r) => (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                <div>
                  <Link href={`/customers/${r.id}`} className="font-medium hover:underline">{r.email}</Link>
                  <span className="ml-2 text-xs text-muted-foreground">{PLAN_NAME[r.plan_id] ?? r.plan_id}</span>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {r.risks.map((k) => (
                      <li key={k.key}>
                        <span className="text-destructive">⚠ {k.label}</span> <span className="text-muted-foreground">→ {k.fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <span className="tabular-nums">{signed(r.profit)}</span>
              </div>
            ))}
          </div>
          {risky.length > 20 && (
            <Link href={qs({ show: "risk" })} className="text-sm underline">Lihat semua {num(risky.length)} akun</Link>
          )}
        </section>
      )}

      <section className="space-y-3">
        <SectionTitle hint={`${num(total)} akun${total > SHOW ? `, ditampilkan ${SHOW} teratas` : ""}`}>Semua akun</SectionTitle>
        <form className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="range" value={range} />
          <select name="show" defaultValue={show} className="h-9 rounded-md border bg-background px-2 text-sm">
            {Object.entries(FILTER).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select name="sort" defaultValue={sort} className="h-9 rounded-md border bg-background px-2 text-sm">
            {Object.entries(SORT).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground">Terapkan</button>
        </form>
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2.5">Akun</th>
                <th className="p-2.5">Paket</th>
                <th className="p-2.5 text-right">Pendapatan</th>
                <th className="p-2.5 text-right">Biaya AI</th>
                <th className="p-2.5 text-right">Laba / rugi</th>
                <th className="p-2.5 text-right">Margin</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Kredit bln ini</th>
                <th className="p-2.5">Terakhir aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {rows.map((r) => {
                const m = marginPct(r.revenue, r.cost);
                return (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="p-2.5">
                      <Link href={`/customers/${r.id}`} className="font-medium hover:underline">{r.email}</Link>
                      <div className="text-xs text-muted-foreground">
                        {num(r.events)} aktivitas AI{r.banned && " · diblokir"}
                        {r.risks.length > 0 && <span className="text-destructive"> · ⚠ {r.risks.length} risiko</span>}
                      </div>
                    </td>
                    <td className="p-2.5">{PLAN_NAME[r.plan_id] ?? r.plan_id}</td>
                    <td className="p-2.5 text-right">{rupiah(r.revenue)}</td>
                    <td className="p-2.5 text-right">{rupiah(r.cost)}</td>
                    <td className={`p-2.5 text-right font-medium ${r.profit < 0 ? "text-destructive" : ""}`}>{signed(r.profit)}</td>
                    <td className="p-2.5 text-right">{m === null ? "-" : `${m}%`}</td>
                    <td className="p-2.5">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${TONE[r.status]}`}>{PNL_STATUS[r.status].label}</span>
                    </td>
                    <td className="p-2.5 text-right text-xs">
                      {r.month_limit === null ? "-" : `${num(r.month_used ?? 0)} / ${num(r.month_limit)}`}
                      {r.credit_override !== null && <div className="text-muted-foreground">kuota khusus</div>}
                    </td>
                    <td className="p-2.5 text-xs">{r.last_active_at ? dateID(r.last_active_at) : "-"}</td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-foreground">Tidak ada akun yang cocok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Akun Free memang selalu &quot;rugi&quot; kecil (biaya promosi) — yang perlu diwaspadai adalah akun berbayar yang rugi atau untung tipis. Biaya AI
          adalah estimasi dari harga resmi penyedia; Gemini gratis tercatat Rp0.
        </p>
      </section>
    </div>
  );
}
