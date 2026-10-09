import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityChart } from "./activity-chart";

const TIER_LABEL: Record<string, string> = {
  junior: "Markethink Junior",
  senior: "Markethink Senior",
  associate: "Markethink Associate",
};

const nf = new Intl.NumberFormat("id-ID");

export default async function AdminPage() {
  const admin = createAdminClient();
  const [overview, byTier, byModel, daily, feedback] = await Promise.all([
    admin.rpc("admin_overview").single<Record<string, number>>(),
    admin.rpc("admin_usage_by_tier", { p_days: 30 }),
    admin.rpc("admin_usage_by_model", { p_days: 30 }),
    admin.rpc("admin_daily_activity", { p_days: 30 }),
    admin
      .from("message_feedback")
      .select("id, chat_id, message_id, reason, comment, created_at, profiles(email)")
      .eq("rating", -1)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);
  const o = overview.data ?? {};
  const tiers = (byTier.data ?? []) as {
    tier: string;
    messages: number;
    users: number;
    input_tokens: number;
    output_tokens: number;
    credits: number;
    est_cost_usd: number;
  }[];
  const totalCost = tiers.reduce((a, t) => a + Number(t.est_cost_usd), 0);

  // Ambil cuplikan jawaban yang di-👎
  const fb = feedback.data ?? [];
  const snippets = new Map<string, string>();
  if (fb.length) {
    const { data: msgs } = await admin
      .from("messages")
      .select("id, chat_id, parts")
      .in("id", fb.map((f) => f.message_id));
    for (const m of msgs ?? []) {
      const text = ((m.parts ?? []) as { type: string; text?: string }[])
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ");
      snippets.set(`${m.chat_id}:${m.id}`, text.slice(0, 220));
    }
  }

  const stats = [
    { label: "Total user", value: o.total_users },
    { label: "User baru 7 hari", value: o.new_users_7d },
    { label: "DAU (hari ini)", value: o.dau },
    { label: "WAU", value: o.wau },
    { label: "Pesan hari ini", value: o.messages_today },
    { label: "Error LLM hari ini", value: o.errors_today },
    { label: "Waitlist Pro", value: o.waitlist },
    { label: "Estimasi biaya LLM 30h*", value: `$${totalCost.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {typeof s.value === "number" ? nf.format(s.value) : (s.value ?? "0")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        *Estimasi jika memakai harga API berbayar; selama beta model free tier biayanya $0.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>User aktif harian (30 hari)</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityChart data={(daily.data ?? []) as { day: string; active_users: number; messages: number }[]} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pemakaian per tier (30 hari)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Tier</th>
                  <th className="text-right">Pesan</th>
                  <th className="text-right">User</th>
                  <th className="text-right">Token in/out</th>
                  <th className="text-right">Kredit</th>
                  <th className="text-right">Est. $</th>
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {tiers.map((t) => (
                  <tr key={t.tier}>
                    <td className="py-2">{TIER_LABEL[t.tier] ?? t.tier}</td>
                    <td className="text-right">{nf.format(t.messages)}</td>
                    <td className="text-right">{nf.format(t.users)}</td>
                    <td className="text-right">
                      {nf.format(t.input_tokens)}/{nf.format(t.output_tokens)}
                    </td>
                    <td className="text-right">{nf.format(t.credits)}</td>
                    <td className="text-right">{Number(t.est_cost_usd).toFixed(2)}</td>
                  </tr>
                ))}
                {!tiers.length && (
                  <tr>
                    <td colSpan={6} className="py-4 text-muted-foreground">Belum ada data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model yang menjawab (30 hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {((byModel.data ?? []) as { provider: string; model: string; messages: number; est_cost_usd: number }[]).map((m) => (
                <li key={`${m.provider}:${m.model}`} className="flex justify-between gap-2 py-2">
                  <span className="truncate font-mono text-xs">{m.provider}:{m.model}</span>
                  <span className="tabular-nums">{nf.format(m.messages)}</span>
                </li>
              ))}
              {!byModel.data?.length && <li className="py-4 text-muted-foreground">Belum ada data.</li>}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Model selain urutan pertama = fallback aktif.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feedback 👎 terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {fb.map((f) => {
              const p = f.profiles as unknown as { email: string } | null;
              return (
                <li key={f.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border px-2 py-0.5 text-foreground">{f.reason ?? "tanpa alasan"}</span>
                    <span>{p?.email}</span>
                    <span>{new Date(f.created_at).toLocaleString("id-ID")}</span>
                  </div>
                  {f.comment && <p>&ldquo;{f.comment}&rdquo;</p>}
                  <p className="line-clamp-2 text-muted-foreground">
                    {snippets.get(`${f.chat_id}:${f.message_id}`) ?? "(pesan sudah dihapus)"}
                  </p>
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
