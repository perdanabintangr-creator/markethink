import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { getSession, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAddonOffers, getAddonQuotas, getToolAccess } from "@/lib/addons/access";
import { AddonOfferCard } from "@/components/tools/addon-offer-card";
import type { AddonOffer } from "@/lib/addons/format";
import type { AddonQuota } from "@/lib/addons/addon-quota";
import { localizedAddons, localizedCreditText, localizedTools, proToolsLabel } from "@/lib/addons/i18n";
import { dateL, toolsText } from "@/lib/i18n/tools";
import { ToolIcon } from "@/components/tools/tool-icon";

export async function generateMetadata() {
  const { profile } = await getSession();
  return { title: proToolsLabel(profile?.language) };
}
export const dynamic = "force-dynamic";

export default async function ToolsHub() {
  const { profile } = await requireUser();
  const admin = createAdminClient();
  const access = await getToolAccess(admin, profile);
  // Paket belum membuka Tools Pro → tiap kelompok bisa dibeli sebagai add-on (status aktif / harga, coret bila promo).
  const [offers, quotas]: [Record<string, AddonOffer>, Record<string, AddonQuota>] = access.allowed
    ? [{}, {}]
    : await Promise.all([getAddonOffers(admin), getAddonQuotas(admin, profile.id)]);
  const lang = profile.language;
  const T = toolsText(lang);
  const ADDONS = localizedAddons(lang);
  const TOOLS = localizedTools(lang);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{proToolsLabel(lang)}</h1>
          <p className="mt-1 text-muted-foreground">{T.hubDesc}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 text-sm">
              <Zap className="size-4 text-primary" />
              <span>
                <span className="font-medium">{localizedCreditText(access, lang)}</span>
                <span className="block text-xs text-muted-foreground">{T.hubQuotaNote}</span>
              </span>
            </p>
            {!access.isAdmin && (
              <Link href="/pricing" className="text-sm font-medium text-primary hover:underline">
                {access.allowed ? T.addQuota : T.unlockTools} →
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
              <span className="block font-semibold">{T.agentCardTitle}</span>
              <span className="block text-sm text-muted-foreground">{T.agentCardDesc}</span>
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
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {T.forRole}
                  {addon.role}
                </p>
                {quotas[addon.id]?.active ? (
                  <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                    ✓ {T.addonActive(quotas[addon.id].remaining, quotas[addon.id].quota, dateL(quotas[addon.id].paidUntil, lang))}
                  </p>
                ) : offers[addon.id] ? (
                  <div className="mt-3 rounded-lg border border-dashed p-3">
                    <AddonOfferCard offer={{ ...offers[addon.id], name: addon.name }} compact />
                  </div>
                ) : null}
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
                      {T.open} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
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
