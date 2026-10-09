import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { experienceLabel, roleLabel } from "@/lib/personas";
import { PLAN_NAME, idr, num } from "@/lib/admin-format";
import { grantCredits, setUserBan, setUserPlan } from "../../actions";
import { Stat } from "../../_components/stat";

export const dynamic = "force-dynamic";

/**
 * Detail satu user untuk tim internal: profil, paket, kredit, pemakaian & biaya, riwayat aktivitas.
 * Isi percakapan sengaja TIDAK ditampilkan (privasi user / UU PDP) — hanya angka & metadata.
 */
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user: me } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const { data: u } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!u) notFound();

  const [credit, usage30, usageAll, logs, ledger, chats, projects, uploads, memories, waitlist] = await Promise.all([
    getCreditStatus(id),
    admin.rpc("admin_user_usage", { p_user_ids: [id], p_days: 30 }),
    admin.rpc("admin_user_usage", { p_user_ids: [id], p_days: 3650 }),
    admin
      .from("usage_logs")
      .select("id, created_at, tier, model, status, credits, est_cost_usd, web_searches, error")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
    admin.from("credit_ledger").select("id, created_at, delta, kind, reason").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    admin.from("chats").select("id", { count: "exact", head: true }).eq("user_id", id),
    admin.from("workspaces").select("id", { count: "exact", head: true }).eq("user_id", id),
    admin.from("attachments").select("id", { count: "exact", head: true }).eq("user_id", id),
    admin.from("memories").select("id", { count: "exact", head: true }).eq("user_id", id),
    admin.from("waitlist").select("plan_interest, note, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(3),
  ]);
  const m30 = ((usage30.data ?? []) as Record<string, number>[])[0] ?? {};
  const mAll = ((usageAll.data ?? []) as Record<string, number>[])[0] ?? {};

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Semua user
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{u.email}</h2>
          <p className="text-sm text-muted-foreground">
            {u.full_name ?? "-"} · {roleLabel(u.persona_role) || "-"} · {u.industry ?? "-"} · {experienceLabel(u.experience) || "-"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Daftar {new Date(u.created_at).toLocaleString("id-ID")} · terakhir aktif{" "}
            {u.last_active_at ? new Date(u.last_active_at).toLocaleString("id-ID") : "-"}
            {u.goal ? ` · tujuan: ${u.goal}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Paket {PLAN_NAME[u.plan_id] ?? u.plan_id}</span>
            {u.role === "admin" && <span className="rounded-full border px-2 py-0.5">Admin</span>}
            {u.banned && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">Diblokir</span>}
            {!u.onboarded && <span className="rounded-full border px-2 py-0.5">Belum onboarding</span>}
          </div>
        </div>
        {u.id !== me.id && (
          <div className="flex flex-wrap gap-2">
            {(["beta", "pro", "promax"] as const)
              .filter((p) => p !== u.plan_id)
              .map((p) => (
                <form key={p} action={setUserPlan.bind(null, u.id, p)}>
                  <Button size="sm" variant="outline">Ubah ke {PLAN_NAME[p]}</Button>
                </form>
              ))}
            <form action={setUserBan.bind(null, u.id, !u.banned)}>
              <Button size="sm" variant={u.banned ? "outline" : "destructive"}>{u.banned ? "Buka blokir" : "Blokir"}</Button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Kredit hari ini" value={`${num(credit.remaining)} / ${num(credit.dailyLimit)}`} sub={`terpakai ${num(credit.used)}`} />
        <Stat label="Chat (30 hari)" value={num(m30.messages)} sub={`total ${num(mAll.messages)}`} />
        <Stat label="Gambar / PPT (30 hari)" value={`${num(m30.images)} / ${num(m30.pptx)}`} />
        <Stat label="Biaya AI (30 hari)" value={idr(m30.cost_usd)} sub={`total ${idr(mAll.cost_usd)}`} />
        <Stat label="Chat tersimpan" value={num(chats.count)} />
        <Stat label="Project" value={num(projects.count)} />
        <Stat label="File diunggah/dibuat" value={num(uploads.count)} />
        <Stat label="Memory AI" value={num(memories.count)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aktivitas AI terakhir</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Waktu</th>
                  <th>Jenis</th>
                  <th>Model</th>
                  <th className="text-right">Kredit</th>
                  <th className="text-right">Biaya</th>
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {(logs.data ?? []).map((l) => (
                  <tr key={l.id} className={l.status !== "ok" ? "text-destructive" : ""}>
                    <td className="py-1.5 text-xs">{new Date(l.created_at).toLocaleString("id-ID")}</td>
                    <td className="text-xs">
                      {l.tier}
                      {l.web_searches ? ` · ${l.web_searches} cari` : ""}
                      {l.status !== "ok" ? " · gagal" : ""}
                    </td>
                    <td className="font-mono text-[11px]">{l.model ?? "-"}</td>
                    <td className="text-right">{l.credits}</td>
                    <td className="text-right">{idr(l.est_cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Beri kredit tambahan hari ini</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={grantCredits.bind(null, u.id)} className="flex gap-2">
                <Input name="amount" placeholder="+20" inputMode="numeric" className="h-9" />
                <Button size="sm">Beri</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Riwayat kredit</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {(ledger.data ?? []).map((l) => (
                  <li key={l.id} className="flex justify-between gap-2 py-1.5">
                    <span className="truncate text-xs">
                      {new Date(l.created_at).toLocaleString("id-ID")} · {l.reason ?? l.kind}
                    </span>
                    <span className={`tabular-nums ${l.delta > 0 ? "text-primary" : ""}`}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {!!waitlist.data?.length && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Minat upgrade (waitlist)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {waitlist.data.map((w, i) => (
                  <p key={i}>
                    <span className="font-medium">{w.plan_interest ?? "Pro"}</span> — {w.note ?? "tanpa catatan"}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Isi percakapan user tidak ditampilkan untuk menjaga privasi (UU PDP).</p>
    </div>
  );
}
