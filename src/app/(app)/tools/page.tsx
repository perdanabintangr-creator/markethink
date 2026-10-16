import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADDONS, TOOLS } from "@/lib/addons/catalog";
import { getToolAccess } from "@/lib/addons/access";
import { TOOL_CREDIT_ESTIMATE, creditText } from "@/lib/addons/format";
import { ToolIcon } from "@/components/tools/tool-icon";

export const metadata = { title: "Tools Pro" };
export const dynamic = "force-dynamic";

export default async function ToolsHub() {
  const { profile } = await requireUser();
  const access = await getToolAccess(createAdminClient(), profile);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Tools Pro</h1>
          <p className="mt-1 text-muted-foreground">
            Dikelompokkan per peran di tim marketing. Hasilnya setara deliverable konsultan & agency: halaman visual + file PPT/Excel siap presentasi.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 text-sm">
              <Zap className="size-4 text-primary" />
              <span>
                <span className="font-medium">{creditText(access)}</span>
                <span className="block text-xs text-muted-foreground">
                  Semua tools memakai kredit bulanan paket kamu: ±{TOOL_CREDIT_ESTIMATE.senior} kredit per hasil (otak Senior), disesuaikan ke pemakaian nyata.
                </span>
              </span>
            </p>
            {!access.isAdmin && (
              <Link href="/pricing" className="text-sm font-medium text-primary hover:underline">
                {access.allowed ? "Tambah kredit / upgrade" : "Buka Tools Pro"} →
              </Link>
            )}
          </div>
          <Link
            href="/tools/agent"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-4 transition-colors hover:border-primary/60"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ToolIcon id="agent" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Markethink Agent · Baru</span>
              <span className="block text-sm text-muted-foreground">Beri satu tujuan, Agent menjalankan beberapa tools berurutan sampai paket kerjanya lengkap.</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-primary" />
          </Link>
          <nav className="mt-4 flex flex-wrap gap-2">
            {ADDONS.map((a) => (
              <a key={a.id} href={`#${a.id}`} className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                {a.emoji} {a.menu}
              </a>
            ))}
          </nav>
        </div>

        {ADDONS.map((addon) => {
          return (
            <section key={addon.id} id={addon.id} className="scroll-mt-4 rounded-2xl border bg-card p-4 sm:p-6">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <span aria-hidden>{addon.emoji}</span> {addon.name}
                </h2>
                <p className="text-sm text-muted-foreground">{addon.tagline}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Untuk: {addon.role}</p>
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
