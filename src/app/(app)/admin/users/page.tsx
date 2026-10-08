import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { grantCredits, setCreditOverride, setUserBan, setUserRole } from "../actions";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { user: me } = await requireAdmin();
  const { q, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const size = 50;
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, email, full_name, role, plan_id, banned, daily_credit_override, persona_role, created_at, last_active_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (q) query = query.ilike("email", `%${q.replace(/[%_,()]/g, "")}%`);
  const { data: users, count } = await query;

  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Cari email…" />
        <Button variant="outline">Cari</Button>
      </form>
      <p className="text-xs text-muted-foreground">{count ?? 0} user</p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">User</th>
              <th className="p-2">Peran</th>
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
                  <div className="font-medium">{u.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.full_name ?? "-"} · {u.role === "admin" ? "admin" : u.plan_id}
                    {u.banned && " · DIBAN"}
                  </div>
                </td>
                <td className="p-2 text-xs">{u.persona_role ?? "-"}</td>
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
          <Button asChild variant="outline" size="sm"><a href={`?q=${q ?? ""}&page=${page - 1}`}>← Sebelumnya</a></Button>
        )}
        {(count ?? 0) > page * size && (
          <Button asChild variant="outline" size="sm"><a href={`?q=${q ?? ""}&page=${page + 1}`}>Berikutnya →</a></Button>
        )}
      </div>
    </div>
  );
}
