import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { idr, num } from "@/lib/admin-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { PLAN_LABEL, type PlanId } from "@/lib/ai/models.config";
import { grantCredits, setBetaAccess, setUserPlan, setCreditOverride, setUserBan, setUserRole } from "../actions";

export const dynamic = "force-dynamic";

const PLAN_FILTERS = [
  { id: "", label: "Semua" },
  { id: "beta", label: "Free" },
  { id: "pro", label: "Pro" },
  { id: "promax", label: "Promax" },
];
const SORTS = [
  { id: "new", label: "Terbaru daftar" },
  { id: "active", label: "Terakhir aktif" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; plan?: string; sort?: string }>;
}) {
  const { user: me } = await requireAdmin();
  const { q, page: pageRaw, plan = "", sort = "new" } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const size = 50;
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, email, full_name, role, plan_id, banned, beta_access, daily_credit_override, persona_role, created_at, last_active_at", { count: "exact" })
    .order(sort === "active" ? "last_active_at" : "created_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * size, page * size - 1);
  if (q) query = query.ilike("email", `%${q.replace(/[%_,()]/g, "")}%`);
  if (["beta", "pro", "promax"].includes(plan)) query = query.eq("plan_id", plan);
  const { data: users, count } = await query;
  const ids = (users ?? []).map((u) => u.id);
  const { data: usageRows } = ids.length
    ? await admin.rpc("admin_user_usage", { p_user_ids: ids, p_days: 30 })
    : { data: [] };
  const usage = new Map(
    ((usageRows ?? []) as { user_id: string; messages: number; images: number; pptx: number; cost_usd: number }[]).map((r) => [r.user_id, r]),
  );
  const qs = (extra: Record<string, string | number>) =>
    `?${new URLSearchParams({ q: q ?? "", plan, sort, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Cari email…" className="max-w-xs" />
        <input type="hidden" name="plan" value={plan} />
        <input type="hidden" name="sort" value={sort} />
        <Button variant="outline">Cari</Button>
        <div className="flex-1" />
        <Button asChild variant="outline">
          <a href="/api/admin/export?type=users">Unduh CSV semua user</a>
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Paket:</span>
        {PLAN_FILTERS.map((f) => (
          <Link
            key={f.id}
            href={qs({ plan: f.id, page: 1 })}
            className={`rounded-full border px-3 py-1 ${plan === f.id ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent"}`}
          >
            {f.label}
          </Link>
        ))}
        <span className="ml-3 text-muted-foreground">Urut:</span>
        {SORTS.map((s) => (
          <Link
            key={s.id}
            href={qs({ sort: s.id, page: 1 })}
            className={`rounded-full border px-3 py-1 ${sort === s.id ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent"}`}
          >
            {s.label}
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{count ?? 0} user · pemakaian = 30 hari terakhir</p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">User</th>
              <th className="p-2">Peran</th>
              <th className="p-2 text-right">Chat</th>
              <th className="p-2 text-right">Gambar/PPT</th>
              <th className="p-2 text-right">Biaya AI</th>
              <th className="p-2">Terakhir aktif</th>
              <th className="p-2">Kuota harian (override)</th>
              <th className="p-2">Tambah kredit hari ini</th>
              <th className="p-2">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(users ?? []).map((u) => (
              <tr key={u.id} className={u.banned ? "bg-destructive/5" : ""}>
                <td className="p-2">
                  <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                    {u.email}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {u.full_name ?? "-"} · paket {PLAN_LABEL[u.plan_id as PlanId] ?? u.plan_id}
                    {u.role === "admin" && " · admin"}
                    {u.banned && " · DIBAN"}
                    {u.role !== "admin" && (u.beta_access ? " · akses beta ✓" : " · belum ada akses")}
                  </div>
                </td>
                <td className="p-2 text-xs">{u.persona_role ?? "-"}</td>
                <td className="p-2 text-right tabular-nums">{num(usage.get(u.id)?.messages ?? 0)}</td>
                <td className="p-2 text-right tabular-nums">
                  {num(usage.get(u.id)?.images ?? 0)}/{num(usage.get(u.id)?.pptx ?? 0)}
                </td>
                <td className="p-2 text-right tabular-nums">{idr(usage.get(u.id)?.cost_usd ?? 0)}</td>
                <td className="p-2 text-xs">{u.last_active_at ? new Date(u.last_active_at).toLocaleString("id-ID") : "-"}</td>
                <td className="p-2">
                  <form action={setCreditOverride.bind(null, u.id)} className="flex gap-1">
                    <Input name="override" defaultValue={u.daily_credit_override ?? ""} placeholder="default" className="h-8 w-24" inputMode="numeric" />
                    <Button size="sm" variant="outline">Set</Button>
                  </form>
                </td>
                <td className="p-2">
                  <form action={grantCredits.bind(null, u.id)} className="flex gap-1">
                    <Input name="amount" placeholder="+10" className="h-8 w-20" inputMode="numeric" />
                    <Button size="sm" variant="outline">Beri</Button>
                  </form>
                </td>
                <td className="p-2">
                  {u.id !== me.id && (
                    <div className="flex gap-1">
                      {(["beta", "pro", "promax"] as const)
                        .filter((p) => p !== u.plan_id)
                        .map((p) => (
                          <form key={p} action={setUserPlan.bind(null, u.id, p)}>
                            <Button size="sm" variant="outline">→ {PLAN_LABEL[p]}</Button>
                          </form>
                        ))}
                      <form action={setBetaAccess.bind(null, u.id, !u.beta_access)}>
                        <Button size="sm" variant={u.beta_access ? "outline" : "default"}>
                          {u.beta_access ? "Cabut akses" : "Beri akses"}
                        </Button>
                      </form>
                      <form action={setUserBan.bind(null, u.id, !u.banned)}>
                        <Button size="sm" variant={u.banned ? "outline" : "destructive"}>{u.banned ? "Unban" : "Ban"}</Button>
                      </form>
                      <form action={setUserRole.bind(null, u.id, u.role === "admin" ? "user" : "admin")}>
                        <Button size="sm" variant="ghost">{u.role === "admin" ? "Cabut admin" : "Jadikan admin"}</Button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        {page > 1 && (
          <Button asChild variant="outline" size="sm"><a href={qs({ page: page - 1 })}>← Sebelumnya</a></Button>
        )}
        {(count ?? 0) > page * size && (
          <Button asChild variant="outline" size="sm"><a href={qs({ page: page + 1 })}>Berikutnya →</a></Button>
        )}
      </div>
    </div>
  );
}
