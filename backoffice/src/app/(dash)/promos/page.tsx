import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/backoffice/stat";
import { PromoPreview } from "@/components/backoffice/promo-preview";
import { PLAN_NAMES, PROMO_SELECT, promoStatus, type PromoRow } from "@/lib/promos";
import { cn } from "@/lib/utils";
import { deletePromo, togglePromo } from "../../promo-actions";
import { DeletePromoButton } from "./delete-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promosi sidebar" };

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) : null;
const nf = new Intl.NumberFormat("id-ID");

export default async function PromosPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { isOwner } = await requireBackoffice();
  if (!isOwner) redirect("/");
  const { saved } = await searchParams;
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: promos }, { data: stats }] = await Promise.all([
    admin.from("promos").select(PROMO_SELECT).order("sort_order").order("created_at", { ascending: false }),
    admin.from("promo_stats").select("promo_id, views, clicks").gte("day", since),
  ]);
  const totals = new Map<string, { views: number; clicks: number }>();
  for (const s of stats ?? []) {
    const t = totals.get(s.promo_id) ?? { views: 0, clicks: 0 };
    t.views += s.views;
    t.clicks += s.clicks;
    totals.set(s.promo_id, t);
  }

  return (
    <div className="space-y-4">
      <PageTitle
        title="Promosi sidebar"
        description="Kartu yang bergeser otomatis di sidebar kiri aplikasi. Perubahan langsung tampil tanpa deploy (pengguna melihatnya setelah memuat ulang halaman)."
        actions={
          <Button asChild size="sm">
            <Link href="/promos/new">+ Promosi baru</Link>
          </Button>
        }
      />
      {saved && <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">Promosi tersimpan.</p>}
      <p className="text-xs text-muted-foreground">
        Statistik = 30 hari terakhir. Tayangan dihitung sekali per sesi per pengguna. Ukuran gambar yang disarankan: 600×400 px (PNG/JPG/WEBP, maks 2 MB).
      </p>
      {promos?.length ? (
        <ul className="space-y-3">
          {(promos as PromoRow[]).map((p) => {
            const st = promoStatus(p);
            const t = totals.get(p.id) ?? { views: 0, clicks: 0 };
            const ctr = t.views ? (t.clicks / t.views) * 100 : 0;
            return (
              <li key={p.id} className="flex flex-col gap-4 rounded-xl border bg-background p-3 sm:flex-row">
                <PromoPreview
                  title={p.title}
                  subtitle={p.subtitle}
                  eyebrow={p.eyebrow}
                  cta={p.cta_label}
                  theme={p.theme}
                  image={p.image_url}
                  brand={p.brand}
                  sponsored={p.sponsored}
                />
                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        st.tone === "ok" && "bg-emerald-500/15 text-emerald-700",
                        st.tone === "info" && "bg-sky-500/15 text-sky-700",
                        st.tone === "muted" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {st.label}
                    </span>
                    {p.sponsored && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700">Sponsor: {p.brand}</span>}
                    <span className="text-xs text-muted-foreground">urutan {p.sort_order}</span>
                  </div>
                  <p className="font-semibold">{p.title}</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <dt>Link</dt>
                    <dd className="truncate text-foreground">{p.link_url}</dd>
                    <dt>Paket</dt>
                    <dd className="text-foreground">{p.plans ? p.plans.map((x) => PLAN_NAMES[x as keyof typeof PLAN_NAMES] ?? x).join(", ") : "Semua paket"}</dd>
                    <dt>Jadwal</dt>
                    <dd className="text-foreground">
                      {fmtDate(p.starts_at) ?? "Sekarang"} → {fmtDate(p.ends_at) ?? "tanpa batas"}
                    </dd>
                  </dl>
                  <div className="grid max-w-sm grid-cols-3 gap-2 pt-1">
                    {[
                      ["Tayangan", nf.format(t.views)],
                      ["Klik", nf.format(t.clicks)],
                      ["CTR", `${ctr.toFixed(1)}%`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg border px-2.5 py-1.5">
                        <p className="text-[11px] text-muted-foreground">{k}</p>
                        <p className="font-semibold tabular-nums">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/promos/${p.id}`}>Edit</Link>
                    </Button>
                    <form action={togglePromo.bind(null, p.id, !p.active)}>
                      <Button size="sm" variant={p.active ? "outline" : "secondary"}>{p.active ? "Nonaktifkan" : "Aktifkan"}</Button>
                    </form>
                    <DeletePromoButton action={deletePromo.bind(null, p.id)} title={p.title} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada promosi. Klik “+ Promosi baru”.</p>
      )}
    </div>
  );
}
