import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { experienceLabel, roleLabel } from "@/lib/personas";
import { FEATURE_NAME, PLAN_NAME, USD_IDR, idr, num, pct, usd } from "@/lib/admin-format";
import { DailyBars, Funnel, HBarList } from "./_components/charts";
import { SectionTitle, Stat } from "./_components/stat";

export const dynamic = "force-dynamic";

type Kpis = Record<string, number>;
interface PlanRow {
  plan_id: string;
  plan_name: string;
  monthly_price_idr: number;
  daily_credits: number;
  users: number;
  active_users: number;
  messages: number;
  cost_usd: number;
}
interface DayRow {
  day: string;
  signups: number;
  active_users: number;
  messages: number;
  cost_usd: number;
  errors: number;
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient();
  const [kpis, plans, daily, funnel, features, personas, feedback] = await Promise.all([
    admin.rpc("admin_kpis").single<Kpis>(),
    admin.rpc("admin_plan_breakdown", { p_days: 30 }),
    admin.rpc("admin_daily_series", { p_days: 30 }),
    admin.rpc("admin_funnel").single<Kpis>(),
    admin.rpc("admin_feature_usage", { p_days: 30 }),
    admin.rpc("admin_personas"),
    admin
      .from("message_feedback")
      .select("id, chat_id, message_id, reason, comment, created_at, profiles(email)")
      .eq("rating", -1)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const k = kpis.data ?? {};
  const planRows = (plans.data ?? []) as PlanRow[];
  const days = (daily.data ?? []) as DayRow[];
  const f = funnel.data ?? {};
  const feat = (features.data ?? []) as { feature: string; total: number; users: number }[];
  const pers = (personas.data ?? []) as { kind: string; value: string; users: number }[];
  const fb = feedback.data ?? [];

  const mrr = planRows.reduce((a, p) => a + Number(p.monthly_price_idr) * Number(p.users), 0);
  const errorRate = Number(k.messages_today) + Number(k.errors_today) > 0 ? pct(Number(k.errors_today), Number(k.messages_today) + Number(k.errors_today)) : "–";
  const costPerActive = Number(k.mau) > 0 ? Number(k.cost_30d) / Number(k.mau) : 0;

  return (
    <div className="space-y-8">
      {/* --- User --- */}
      <section className="space-y-3">
        <SectionTitle hint="DAU/WAU/MAU = user yang chat dalam 1 / 7 / 30 hari terakhir">User</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total user" value={num(k.total_users)} sub={`${num(k.banned)} diblokir`} />
          <Stat label="User baru" value={num(k.new_today)} sub={`hari ini · ${num(k.new_7d)} dalam 7 hari · ${num(k.new_30d)} dalam 30 hari`} />
          <Stat label="Aktif hari ini (DAU)" value={num(k.dau)} sub={`WAU ${num(k.wau)} · MAU ${num(k.mau)}`} />
          <Stat
            label="Kelengketan (DAU/MAU)"
            value={pct(Number(k.dau), Number(k.mau))}
            sub="makin tinggi = makin sering dipakai"
          />
        </div>
      </section>

      {/* --- Paket --- */}
      <section className="space-y-3">
        <SectionTitle hint={<Link href="/admin/quota" className="underline">Atur harga & kredit paket →</Link>}>Paket & pendapatan</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">User per paket</CardTitle>
            </CardHeader>
            <CardContent>
              <HBarList
                items={planRows.map((p) => ({
                  label: PLAN_NAME[p.plan_id] ?? p.plan_name,
                  value: Number(p.users),
                  sub: pct(Number(p.users), Number(k.total_users)),
                }))}
              />
              <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Estimasi MRR (pendapatan bulanan)</p>
                <p className="text-xl font-semibold tabular-nums">Rp{num(mrr)}</p>
                {mrr === 0 && <p className="text-xs text-muted-foreground">Harga paket belum diisi / pembayaran belum aktif.</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Biaya AI vs paket (30 hari)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2">Paket</th>
                    <th className="text-right">User aktif</th>
                    <th className="text-right">Chat</th>
                    <th className="text-right">Biaya AI</th>
                    <th className="text-right">Biaya / user aktif</th>
                    <th className="text-right">Harga / bln</th>
                  </tr>
                </thead>
                <tbody className="divide-y tabular-nums">
                  {planRows.map((p) => {
                    const per = Number(p.active_users) > 0 ? Number(p.cost_usd) / Number(p.active_users) : 0;
                    return (
                      <tr key={p.plan_id}>
                        <td className="py-2 font-medium">{PLAN_NAME[p.plan_id] ?? p.plan_name}</td>
                        <td className="text-right">{num(p.active_users)}</td>
                        <td className="text-right">{num(p.messages)}</td>
                        <td className="text-right">{idr(p.cost_usd)}</td>
                        <td className="text-right">{idr(per)}</td>
                        <td className="text-right">{Number(p.monthly_price_idr) ? `Rp${num(p.monthly_price_idr)}` : "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                Bandingkan &quot;Biaya / user aktif&quot; dengan harga paket untuk menilai margin. Akun admin ikut terhitung di paketnya.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* --- Biaya & kesehatan --- */}
      <section className="space-y-3">
        <SectionTitle hint={<Link href="/admin/costs" className="underline">Rincian biaya →</Link>}>Biaya AI & kesehatan sistem</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Biaya AI hari ini" value={idr(k.cost_today)} sub={usd(k.cost_today)} />
          <Stat label="Biaya AI 30 hari" value={idr(k.cost_30d)} sub={`7 hari: ${idr(k.cost_7d)}`} />
          <Stat label="Biaya per user aktif (30h)" value={idr(costPerActive)} sub={`kurs Rp${num(USD_IDR)}/$`} />
          <Stat
            label="Error hari ini"
            value={num(k.errors_today)}
            sub={<Link href="/admin/errors" className="underline">{`tingkat error ${errorRate} · lihat log →`}</Link>}
            tone={Number(k.errors_today) > 0 ? "warn" : undefined}
          />
        </div>
      </section>

      {/* --- Tren 30 hari --- */}
      <section className="space-y-3">
        <SectionTitle hint="Arahkan kursor ke batang untuk melihat angkanya">Tren 30 hari</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["Pendaftar baru per hari", "signups", num],
              ["User aktif per hari", "active_users", num],
              ["Jumlah chat per hari", "messages", num],
              ["Biaya AI per hari", "cost_usd", idr],
            ] as const
          ).map(([title, key, fmt]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <DailyBars label={title} data={days.map((d) => ({ day: d.day, value: Number(d[key]) }))} format={(v) => fmt(v)} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* --- Funnel & fitur --- */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funnel aktivasi (semua waktu, tanpa admin)</CardTitle>
          </CardHeader>
          <CardContent>
            <Funnel
              steps={[
                { label: "Daftar", value: Number(f.signups) },
                { label: "Selesai onboarding", value: Number(f.onboarded) },
                { label: "Kirim chat pertama", value: Number(f.first_message) },
                { label: "Aktif ≥ 3 hari berbeda", value: Number(f.active_3_days) },
                { label: "Berlangganan (Pro/Promax)", value: Number(f.paying) },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fitur yang dipakai (30 hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <HBarList
              items={feat
                .filter((x) => Number(x.total) > 0)
                .sort((a, b) => Number(b.total) - Number(a.total))
                .map((x) => ({ label: FEATURE_NAME[x.feature] ?? x.feature, value: Number(x.total), sub: `${num(x.users)} user` }))}
              empty="Belum ada pemakaian fitur."
            />
          </CardContent>
        </Card>
      </section>

      {/* --- Profil user --- */}
      <section className="space-y-3">
        <SectionTitle hint="Dari jawaban onboarding — untuk menyusun target pasar & konten promosi">Siapa user kita</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {(
            [
              ["Peran", "role", roleLabel],
              ["Industri", "industry", (v: string) => v],
              ["Pengalaman", "experience", experienceLabel],
            ] as const
          ).map(([title, kind, labelOf]) => (
            <Card key={kind}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <HBarList
                  items={pers
                    .filter((p) => p.kind === kind)
                    .slice(0, 8)
                    .map((p) => ({ label: p.value === "(kosong)" ? "(belum diisi)" : labelOf(p.value) || p.value, value: Number(p.users) }))}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* --- Feedback --- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feedback 👎 terbaru (bahan perbaikan kualitas jawaban)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {fb.map((x) => {
              const p = x.profiles as unknown as { email: string } | null;
              return (
                <li key={x.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border px-2 py-0.5 text-foreground">{x.reason ?? "tanpa alasan"}</span>
                    <span>{p?.email}</span>
                    <span>{new Date(x.created_at).toLocaleString("id-ID")}</span>
                  </div>
                  {x.comment && <p>&ldquo;{x.comment}&rdquo;</p>}
                </li>
              );
            })}
            {!fb.length && <li className="py-4 text-sm text-muted-foreground">Belum ada feedback negatif.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
