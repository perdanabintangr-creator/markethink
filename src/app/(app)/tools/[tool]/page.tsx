import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock } from "lucide-react";
import { getSession, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addonInfo, toolInfo } from "@/lib/addons/catalog";
import { getAddonOffers, getToolAccess } from "@/lib/addons/access";
import { localizeAddonInfo, localizeToolInfo, localizedCreditText, localizedTools, noQuotaLabel, proToolsLabel } from "@/lib/addons/i18n";
import { dateL, toolsText } from "@/lib/i18n/tools";
import { PLAN_OFFER_COLUMNS, toPlanOffer } from "@/lib/plan-offers";
import { ToolRunner } from "@/components/tools/tool-runner";
import { Calculators } from "@/components/tools/calculators";
import { ToolIcon } from "@/components/tools/tool-icon";
import { ToolLocked } from "@/components/tools/tool-locked";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const { profile } = await getSession();
  const info = toolInfo(tool);
  return { title: info ? localizeToolInfo(info, profile?.language).name : proToolsLabel(profile?.language) };
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const baseInfo = toolInfo(tool);
  if (!baseInfo) notFound();
  const { supabase, profile } = await requireUser();
  const lang = profile.language;
  const T = toolsText(lang);
  // Teks tampilan sesuai bahasa user (id = objek asli).
  const info = localizeToolInfo(baseInfo, lang);
  const addon = localizeAddonInfo(addonInfo(baseInfo.addon)!, lang);
  const admin = createAdminClient();
  const access = await getToolAccess(admin, profile, baseInfo.addon);
  // Terkunci (paket Free) → tampilkan pilihan upgrade paket, bukan form. Kalkulator tetap terlihat dengan overlay.
  const locked = !access.allowed;
  const { data: planRows } =
    locked && !info.noQuota
      ? await supabase.from("plans").select(PLAN_OFFER_COLUMNS).in("id", ["starter", "pro", "promax"]).order("sort_order")
      : { data: [] };
  const plans = (planRows ?? []).map((r) => toPlanOffer(r));
  // Paket belum membuka Tools Pro → tawarkan juga add-on kelompok ini saja (harga coret bila promo).
  const addonOffer = !access.allowed && !info.noQuota ? ((await getAddonOffers(admin))[baseInfo.addon] ?? null) : null;
  const { data: runs } = info.noQuota
    ? { data: [] }
    : await supabase
        .from("tool_runs")
        .select("id, title, status, created_at")
        .eq("tool", tool)
        .order("created_at", { ascending: false })
        .limit(10);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
        <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {proToolsLabel(lang)}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ToolIcon id={tool} className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{info.name}</h1>
              <p className="text-sm text-muted-foreground">{info.short}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {addon.emoji} {addon.name} · {info.noQuota ? noQuotaLabel(lang) : localizedCreditText(access, lang)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {info.outputs.map((o) => (
            <span key={o} className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              ✓ {o}
            </span>
          ))}
        </div>

        {info.noQuota ? (
          <Calculators locked={locked} />
        ) : locked ? (
          <ToolLocked
            toolName={info.name}
            noteName={baseInfo.name}
            plans={plans}
            addon={addonOffer && { ...addonOffer, name: addon.name, tools: localizedTools(lang).filter((t) => t.addon === baseInfo.addon && !t.noQuota).map((t) => t.name) }}
          />
        ) : (
          <ToolRunner tool={tool} access={access} />
        )}

        {!!runs?.length && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{T.history}</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link href={`/tools/${tool}/${r.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent/50">
                    {r.status === "ok" ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : r.status === "error" ? (
                      <CircleAlert className="size-4 text-destructive" />
                    ) : (
                      <Clock className="size-4 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{r.title ?? info.name}</span>
                    <span className="text-xs text-muted-foreground">{dateL(r.created_at, lang)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
