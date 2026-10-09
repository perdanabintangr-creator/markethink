import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { PageTitle } from "@/components/backoffice/stat";
import { PLAN_NAME, num } from "@/lib/admin-format";
import { dateID, daysUntil, durationSince, rupiah } from "@/lib/backoffice-format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pelanggan" };

const PAGE = 50;

const STATUS: Record<string, string> = {
  all: "Semua akun",
  paying: "Berbayar",
  free: "Free",
  expiring: "Habis ≤ 7 hari",
  overdue: "Lewat masa aktif",
  no_record: "Berbayar tanpa catatan bayar",
  churned: "Pernah bayar, kini Free",
  internal: "Akun admin aplikasi",
};
const SORT: Record<string, string> = {
  newest: "Terbaru daftar",
  active: "Terakhir aktif",
  paid: "Total bayar terbesar",
  until: "Masa aktif paling dekat habis",
};

interface Row {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  internal: boolean;
  plan_id: string;
  banned: boolean;
  created_at: string;
  plan_started_at: string | null;
  last_active_at: string | null;
  first_paid_at: string | null;
  active_until: string | null;
  total_paid: number;
  payments: number;
  total_count: number;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; status?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const plan = ["beta", "pro", "promax"].includes(sp.plan ?? "") ? sp.plan! : "";
  const status = sp.status && sp.status in STATUS ? sp.status : "all";
  const sort = sp.sort && sp.sort in SORT ? sp.sort : "newest";
  const page = Math.max(1, Number(sp.page) || 1);

  const { data } = await createAdminClient().rpc("bo_customer_list", {
    p_search: q || null,
    p_plan: plan || null,
    p_status: status,
    p_sort: sort,
    p_limit: PAGE,
    p_offset: (page - 1) * PAGE,
  });
  const rows = (data ?? []) as Row[];
  const total = Number(rows[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams({ ...(q && { q }), ...(plan && { plan }), status, sort, page: String(p) });
    return `?${u}`;
  };
  const exportQs = new URLSearchParams({ type: "customers", ...(q && { q }), ...(plan && { plan }), status, sort });

  return (
    <div className="space-y-4">
      <PageTitle
        title={status === "all" ? "Pelanggan" : `Pelanggan · ${STATUS[status]}`}
        description={`${num(total)} akun ditemukan${q ? ` untuk "${q}"` : ""}.`}
        actions={
          <Button asChild size="sm">
            <Link href="/backoffice/sales/new">+ Catat penjualan</Link>
          </Button>
        }
      />
      <form className="flex flex-wrap items-end gap-2 rounded-xl border bg-background p-3">
        <Input name="q" defaultValue={q} placeholder="Cari email atau nama…" className="w-full sm:w-64" />
        <NativeSelect name="plan" defaultValue={plan} className="w-auto">
          <option value="">Semua paket</option>
          <option value="beta">Free</option>
          <option value="pro">Pro</option>
          <option value="promax">Promax</option>
        </NativeSelect>
        <NativeSelect name="status" defaultValue={status} className="w-auto">
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </NativeSelect>
        <NativeSelect name="sort" defaultValue={sort} className="w-auto">
          {Object.entries(SORT).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </NativeSelect>
        <Button type="submit">Terapkan</Button>
        <Button asChild variant="outline" className="ml-auto">
          <a href={`/api/backoffice/export?${exportQs}`}>Unduh Excel (CSV)</a>
        </Button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2.5">Pelanggan</th>
              <th className="p-2.5">Paket</th>
              <th className="p-2.5">Lama di paket ini</th>
              <th className="p-2.5">Aktif sampai</th>
              <th className="p-2.5">Pelanggan sejak</th>
              <th className="p-2.5 text-right">Total bayar</th>
              <th className="p-2.5">Daftar</th>
              <th className="p-2.5">Terakhir aktif</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((u) => {
              const left = daysUntil(u.active_until);
              const paid = u.plan_id !== "beta";
              return (
                <tr key={u.id} className="hover:bg-muted/40">
                  <td className="p-2.5">
                    <Link href={`/backoffice/customers/${u.id}`} className="font-medium hover:underline">{u.email}</Link>
                    <div className="text-xs text-muted-foreground">
                      {u.full_name ?? "-"}
                      {u.internal && " · admin aplikasi"}
                      {u.banned && " · diblokir"}
                    </div>
                  </td>
                  <td className="p-2.5">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${paid ? "border-primary/40 bg-primary/10 text-primary" : ""}`}>
                      {PLAN_NAME[u.plan_id] ?? u.plan_id}
                    </span>
                  </td>
                  <td className="p-2.5 text-xs">
                    {durationSince(u.plan_started_at)}
                    <div className="text-muted-foreground">sejak {dateID(u.plan_started_at)}</div>
                  </td>
                  <td className="p-2.5 text-xs">
                    {!paid ? (
                      "-"
                    ) : u.active_until ? (
                      <>
                        {dateID(u.active_until)}
                        <div className={left !== null && left <= 7 ? "font-medium text-destructive" : "text-muted-foreground"}>
                          {left !== null && left < 0 ? `lewat ${-left} hari` : `sisa ${left} hari`}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">belum ada catatan bayar</span>
                    )}
                  </td>
                  <td className="p-2.5 text-xs">
                    {u.first_paid_at ? (
                      <>
                        {durationSince(u.first_paid_at)}
                        <div className="text-muted-foreground">{dateID(u.first_paid_at)}</div>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-2.5 text-right tabular-nums">
                    {rupiah(u.total_paid)}
                    <div className="text-xs text-muted-foreground">{num(u.payments)}× bayar</div>
                  </td>
                  <td className="p-2.5 text-xs">{dateID(u.created_at)}</td>
                  <td className="p-2.5 text-xs">{u.last_active_at ? dateID(u.last_active_at) : "-"}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">Tidak ada akun yang cocok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={qs(page - 1)} className="rounded-md border px-3 py-1 hover:bg-accent">← Sebelumnya</Link>}
          <span className="text-muted-foreground">Halaman {page} dari {pages}</span>
          {page < pages && <Link href={qs(page + 1)} className="rounded-md border px-3 py-1 hover:bg-accent">Berikutnya →</Link>}
        </div>
      )}
    </div>
  );
}
