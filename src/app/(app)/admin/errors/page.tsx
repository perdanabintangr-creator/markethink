import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_NAME } from "@/lib/admin-format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Error log" };

/** Log error AI terbaru (dari usage_logs) untuk diagnosa cepat. */
export default async function AdminErrorsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("usage_logs")
    .select("id, created_at, tier, provider, model, error, user_id, chat_id, profiles(email, plan_id)")
    .or("status.neq.ok,error.not.is.null")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        100 kejadian terakhir: permintaan gagal (kredit otomatis dikembalikan) dan peringatan (mis. pencarian web dilewati).
      </p>
      <ul className="divide-y rounded-xl border">
        {rows.map((r) => {
          const p = r.profiles as unknown as { email: string; plan_id: string } | null;
          return (
            <li key={r.id} className="space-y-1 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{new Date(r.created_at).toLocaleString("id-ID")}</span>
                <span className="rounded-full border px-2 py-0.5 text-foreground">{r.tier ?? "-"}</span>
                {r.model && <span className="font-mono">{r.provider}:{r.model}</span>}
                {p && (
                  <Link href={`/admin/users/${r.user_id}`} className="hover:underline">
                    {p.email} · {PLAN_NAME[p.plan_id] ?? p.plan_id}
                  </Link>
                )}
              </div>
              <p className="line-clamp-3 break-all font-mono text-xs">{r.error ?? "(tanpa pesan)"}</p>
            </li>
          );
        })}
        {!rows.length && <li className="p-4 text-sm text-muted-foreground">Tidak ada error. 🎉</li>}
      </ul>
    </div>
  );
}
