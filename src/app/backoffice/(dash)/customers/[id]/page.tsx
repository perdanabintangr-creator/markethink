import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Stat } from "@/components/backoffice/stat";
import { SaleForm } from "@/components/backoffice/sale-form";
import { ConfirmAction } from "@/components/backoffice/confirm-submit";
import { PLAN_NAME, USD_IDR, num } from "@/lib/admin-format";
import { SALE_KIND, dateID, daysUntil, durationSince, rupiah } from "@/lib/backoffice-format";
import { experienceLabel, roleLabel } from "@/lib/personas";
import { changePlan, refundSale } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detail pelanggan" };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const [{ data: u }, { data: subs }, { data: changes }, { data: usage }, { data: plans }, { data: member }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, full_name, role, plan_id, plan_started_at, banned, persona_role, industry, experience, goal, onboarded, created_at, last_active_at")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("subscriptions")
      .select("id, plan_id, status, kind, amount_idr, months, payment_method, note, paid_at, refunded_at, current_period_start, current_period_end, creator:profiles!subscriptions_created_by_fkey(email)")
      .eq("user_id", id)
      .order("paid_at", { ascending: false }),
    admin
      .from("plan_changes")
      .select("id, from_plan, to_plan, note, created_at, actor:profiles!plan_changes_changed_by_fkey(email)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin.rpc("admin_user_usage", { p_user_ids: [id], p_days: 30 }),
    admin.from("plans").select("id, monthly_price_idr"),
    admin.from("backoffice_members").select("user_id").eq("user_id", id).maybeSingle(),
  ]);
  if (!u) notFound();

  const sales = subs ?? [];
  const valid = sales.filter((s) => !s.refunded_at);
  const totalPaid = valid.reduce((a, s) => a + Number(s.amount_idr), 0);
  const firstPaid = valid.length ? valid[valid.length - 1].paid_at : null;
  const activeUntil = sales
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce<string | null>((a, s) => (!a || s.current_period_end > a ? s.current_period_end : a), null);
  const left = daysUntil(activeUntil);
  const use = (usage ?? [])[0] as { messages: number; images: number; pptx: number; cost_usd: number; last_active: string } | undefined;
  const prices = Object.fromEntries((plans ?? []).map((p) => [p.id, Number(p.monthly_price_idr)]));
  const paid = u.plan_id !== "beta";
  const internal = u.role !== "user" || Boolean(member);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/backoffice/customers" className="text-xs text-muted-foreground hover:underline">← Semua pelanggan</Link>
          <h1 className="mt-1 text-xl font-semibold">{u.full_name || u.email}</h1>
          <p className="text-sm text-muted-foreground">
            {u.email}
            {internal && " · tim internal"}
            {u.banned && " · diblokir"}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-sm font-medium ${paid ? "border-primary/40 bg-primary/10 text-primary" : ""}`}>
          Paket {PLAN_NAME[u.plan_id] ?? u.plan_id}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lama di paket sekarang" value={durationSince(u.plan_started_at)} sub={`sejak ${dateID(u.plan_started_at)}`} />
        <Stat
          label="Aktif sampai"
          value={paid ? (activeUntil ? dateID(activeUntil) : "–") : "Free"}
          sub={paid ? (activeUntil ? (left! < 0 ? `lewat ${-left!} hari` : `sisa ${left} hari`) : "belum ada catatan bayar") : "tidak ada masa aktif"}
          tone={paid && (left === null || left <= 7) ? "warn" : undefined}
        />
        <Stat label="Pelanggan berbayar sejak" value={firstPaid ? durationSince(firstPaid) : "–"} sub={firstPaid ? dateID(firstPaid) : "belum pernah bayar"} />
        <Stat label="Total sudah dibayar" value={rupiah(totalPaid)} sub={`${num(valid.length)}× pembayaran`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Catat pembayaran pelanggan ini</CardTitle>
            <p className="text-xs text-muted-foreground">
              Perpanjangan paket yang sama otomatis menyambung dari tanggal habis sebelumnya. Ganti paket = periode baru mulai hari ini.
            </p>
          </CardHeader>
          <CardContent>
            <SaleForm userId={u.id} prices={prices} defaultPlan={u.plan_id} />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Profil</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Daftar</dt>
                <dd>{dateID(u.created_at)} ({durationSince(u.created_at)})</dd>
                <dt className="text-muted-foreground">Terakhir aktif</dt>
                <dd>{u.last_active_at ? `${dateID(u.last_active_at)} (${durationSince(u.last_active_at)} lalu)` : "-"}</dd>
                <dt className="text-muted-foreground">Peran</dt>
                <dd>{u.persona_role ? roleLabel(u.persona_role) : "-"}</dd>
                <dt className="text-muted-foreground">Industri</dt>
                <dd>{u.industry || "-"}</dd>
                <dt className="text-muted-foreground">Pengalaman</dt>
                <dd>{u.experience ? experienceLabel(u.experience) : "-"}</dd>
                <dt className="text-muted-foreground">Tujuan</dt>
                <dd className="break-words">{u.goal || "-"}</dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pemakaian 30 hari</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div>Chat: <b>{num(use?.messages)}</b></div>
              <div>Gambar: <b>{num(use?.images)}</b></div>
              <div>PPT: <b>{num(use?.pptx)}</b></div>
              <div>Biaya AI: <b>{rupiah(Number(use?.cost_usd ?? 0) * USD_IDR)}</b></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ubah paket tanpa pembayaran</CardTitle>
              <p className="text-xs text-muted-foreground">Untuk bonus/kompensasi, atau pilih Free bila pelanggan berhenti berlangganan.</p>
            </CardHeader>
            <CardContent>
              <form action={changePlan.bind(null, u.id)} className="flex flex-wrap gap-2">
                <NativeSelect name="plan_id" defaultValue={u.plan_id} className="w-auto">
                  <option value="beta">Free (berhenti)</option>
                  <option value="pro">Pro</option>
                  <option value="promax">Promax</option>
                </NativeSelect>
                <Input name="note" placeholder="Alasan (opsional)" maxLength={300} className="min-w-40 flex-1" />
                <Button type="submit" variant="outline">Simpan</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Riwayat pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Tanggal bayar</th>
                <th>Paket</th>
                <th>Jenis</th>
                <th>Periode</th>
                <th>Metode</th>
                <th className="text-right">Nominal</th>
                <th>Dicatat oleh</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.map((s) => {
                const by = s.creator as unknown as { email: string | null } | null;
                return (
                  <tr key={s.id} className={s.refunded_at ? "text-muted-foreground line-through" : ""}>
                    <td className="py-2">{dateID(s.paid_at)}</td>
                    <td>{PLAN_NAME[s.plan_id] ?? s.plan_id} · {s.months} bln</td>
                    <td>{SALE_KIND[s.kind] ?? s.kind}</td>
                    <td className="text-xs">
                      {dateID(s.current_period_start)} – {dateID(s.current_period_end)}
                      {s.note && <div className="text-muted-foreground no-underline">{s.note}</div>}
                    </td>
                    <td>{s.payment_method ?? "-"}</td>
                    <td className="text-right tabular-nums">{rupiah(s.amount_idr)}</td>
                    <td className="text-xs">{by?.email ?? "-"}</td>
                    <td className="text-right">
                      {s.refunded_at ? (
                        <span className="text-xs no-underline">dibatalkan</span>
                      ) : (
                        <ConfirmAction
                          action={refundSale.bind(null, s.id, u.id)}
                          title="Batalkan penjualan ini?"
                          description="Dipakai bila salah catat atau uang dikembalikan. Nominal tidak dihitung lagi sebagai pendapatan dan masa aktifnya ditutup. Paket user tidak berubah otomatis — ubah manual bila perlu."
                          confirmLabel="Ya, batalkan"
                          size="sm"
                          variant="ghost"
                        >
                          Batalkan
                        </ConfirmAction>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!sales.length && (
                <tr>
                  <td colSpan={8} className="py-4 text-muted-foreground">Belum ada pembayaran tercatat.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Riwayat perubahan paket</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(changes ?? []).map((c) => {
              const actor = c.actor as unknown as { email: string | null } | null;
              return (
                <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <span>
                    {PLAN_NAME[c.from_plan ?? ""] ?? c.from_plan ?? "-"} → <b>{PLAN_NAME[c.to_plan] ?? c.to_plan}</b>
                    {c.note && <span className="text-muted-foreground"> · {c.note}</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dateID(c.created_at)} · {actor?.email ?? "sistem / admin aplikasi"}
                  </span>
                </li>
              );
            })}
            <li className="py-2 text-xs text-muted-foreground">Mendaftar akun: {dateID(u.created_at)}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
