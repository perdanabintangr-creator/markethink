import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { PLAN_NAME } from "@/lib/admin-format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Waitlist" };

/** Calon pelanggan yang menekan "Gabung waitlist" (minat upgrade) — bahan follow-up penjualan. */
export default async function AdminWaitlistPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("waitlist")
    .select("id, email, plan_interest, note, created_at, profiles(plan_id, full_name)")
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = data ?? [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{rows.length} calon pelanggan ingin upgrade.</p>
        <Button asChild variant="outline" size="sm">
          <a href="/api/admin/export?type=waitlist">Unduh CSV</a>
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Email</th>
              <th className="p-2">Paket sekarang</th>
              <th className="p-2">Minat</th>
              <th className="p-2">Kebutuhan</th>
              <th className="p-2">Tanggal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((w) => {
              const p = w.profiles as unknown as { plan_id: string; full_name: string | null } | null;
              return (
                <tr key={w.id}>
                  <td className="p-2">
                    <div className="font-medium">{w.email}</div>
                    {p?.full_name && <div className="text-xs text-muted-foreground">{p.full_name}</div>}
                  </td>
                  <td className="p-2">{p ? (PLAN_NAME[p.plan_id] ?? p.plan_id) : "-"}</td>
                  <td className="p-2">{w.plan_interest ?? "-"}</td>
                  <td className="p-2 text-xs">{w.note ?? "-"}</td>
                  <td className="p-2 text-xs">{new Date(w.created_at).toLocaleDateString("id-ID")}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="p-4 text-muted-foreground">Belum ada yang mendaftar waitlist.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
