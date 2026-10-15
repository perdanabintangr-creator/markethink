import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addonInfo, toolInfo } from "@/lib/addons/catalog";
import { getAddonStatus } from "@/lib/addons/entitlement";
import { toLite } from "@/lib/addons/status-lite";
import { dateID, quotaText } from "@/lib/addons/format";
import { ToolRunner } from "@/components/tools/tool-runner";
import { Calculators } from "@/components/tools/calculators";
import { RequestAddonButton } from "@/components/tools/request-addon";
import { ToolIcon } from "@/components/tools/tool-icon";
import { ToolLocked } from "@/components/tools/tool-locked";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  return { title: toolInfo(tool)?.name ?? "Tools Pro" };
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const info = toolInfo(tool);
  if (!info) notFound();
  const addon = addonInfo(info.addon)!;
  const { supabase, profile } = await requireUser();
  const status = toLite(await getAddonStatus(createAdminClient(), profile, info.addon));
  // Terkunci: tidak punya jatah apa pun (mis. paket Free tanpa add-on) → tampilkan pilihan beli add-on / upgrade, bukan form.
  const locked = !status.hasAccess && !status.nextSource && !status.paidUntil && status.trialRemaining === 0 && status.isFree;
  const { data: planRows } = locked
    ? await supabase.from("plans").select("id, name, monthly_price_idr, daily_credits").in("id", ["pro", "promax"]).order("sort_order")
    : { data: [] };
  const plans = (planRows ?? []).map((p) => ({ id: p.id as "pro" | "promax", name: p.name as string, price: Number(p.monthly_price_idr), credits: Number(p.daily_credits) }));
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
          <ArrowLeft className="size-4" /> Tools Pro
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
                Bagian dari add-on {addon.emoji} {status.name} · {quotaText(status)}
              </p>
            </div>
          </div>
          {!status.isAdmin && !status.paidUntil && !locked && (
            <RequestAddonButton addon={addon.id} name={status.name} price={status.price} quota={status.quota} variant="outline" />
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {info.outputs.map((o) => (
            <span key={o} className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              ✓ {o}
            </span>
          ))}
        </div>

        {locked ? (
          <ToolLocked status={status} toolName={info.name} plans={plans} />
        ) : info.noQuota ? (
          <Calculators locked={!status.hasAccess} status={status} />
        ) : (
          <ToolRunner tool={tool} status={status} />
        )}

        {!!runs?.length && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Riwayat</h2>
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
                    <span className="text-xs text-muted-foreground">{dateID(r.created_at)}</span>
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
