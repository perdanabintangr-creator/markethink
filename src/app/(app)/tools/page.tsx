import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADDONS, TOOLS } from "@/lib/addons/catalog";
import { getAddonStatuses } from "@/lib/addons/entitlement";
import { toLite } from "@/lib/addons/status-lite";
import { quotaText, rupiah } from "@/components/tools/common";
import { RequestAddonButton } from "@/components/tools/request-addon";
import { ToolIcon } from "@/components/tools/tool-icon";

export const metadata = { title: "Tools Pro" };
export const dynamic = "force-dynamic";

export default async function ToolsHub() {
  const { profile } = await requireUser();
  const statuses = (await getAddonStatuses(createAdminClient(), profile)).map(toLite);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Tools Pro</h1>
          <p className="mt-1 text-muted-foreground">
            Alat siap pakai untuk masalah marketing paling sering — hasilnya halaman visual + file PPT/Excel, bukan sekadar teks chat.
          </p>
        </div>

        {ADDONS.map((addon) => {
          const st = statuses.find((x) => x.id === addon.id)!;
          const active = st.isAdmin || Boolean(st.paidUntil);
          return (
            <section key={addon.id} className="rounded-2xl border bg-card p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <span aria-hidden>{addon.emoji}</span> {st.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{addon.tagline}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rupiah(st.price)}/bulan · {st.quota}× pakai/bulan{st.isPromax ? "" : ` · Promax gratis ${st.promaxQuota}×/bulan`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs ${active || st.isPromax ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {quotaText(st)}
                  </span>
                  {!st.isAdmin && (
                    <RequestAddonButton
                      addon={addon.id}
                      name={st.name}
                      price={st.price}
                      quota={st.quota}
                      label={st.paidUntil ? "Perpanjang" : "Beli add-on"}
                      variant={active ? "outline" : "default"}
                    />
                  )}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {TOOLS.filter((t) => t.addon === addon.id).map((t) => (
                  <Link
                    key={t.id}
                    href={`/tools/${t.id}`}
                    className="group flex flex-col rounded-xl border bg-background p-4 transition-colors hover:border-primary/50 hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ToolIcon id={t.id} className="size-5" />
                      </span>
                      <span className="font-medium">{t.name}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{t.short}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {t.outputs.slice(0, 4).map((o) => (
                        <span key={o} className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {o}
                        </span>
                      ))}
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Buka <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
