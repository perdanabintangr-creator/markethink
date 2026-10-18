import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { proToolsLabel } from "@/lib/addons/i18n";
import { dateL, toolsText } from "@/lib/i18n/tools";
import { agentBudget } from "@/lib/agent/server";
import { AgentStart } from "@/components/agent/agent-start";
import { ToolIcon } from "@/components/tools/tool-icon";
import type { AgentStep } from "@/lib/agent/catalog";

export const metadata = { title: "Markethink Agent" };
export const dynamic = "force-dynamic";

export default async function AgentHome() {
  const { profile } = await requireUser();
  const lang = profile.language;
  const T = toolsText(lang);
  const admin = createAdminClient();
  const [{ access, maxSteps }, { data: runs }] = await Promise.all([
    agentBudget(admin, profile, "senior"),
    admin.from("agent_runs").select("id, title, goal, status, plan, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const locked = !access.agent || maxSteps < 1;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
        <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {proToolsLabel(lang)}
        </Link>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ToolIcon id="agent" className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              Markethink Agent <span className="ml-1 align-middle rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{T.newBadge}</span>
            </h1>
            <p className="text-sm text-muted-foreground">{T.agentDesc}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {T.agentHow.map((h) => (
            <div key={h.t} className="rounded-xl border bg-card p-3">
              <p className="text-sm font-semibold">{h.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{h.d}</p>
            </div>
          ))}
        </div>

        {locked && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
            🔒 {access.agent ? T.agentNoQuota : T.agentPlanLocked}{" "}
            <Link href="/pricing" className="font-medium text-primary underline">
              {T.seePlans}
            </Link>
          </div>
        )}

        <AgentStart locked={locked} />

        {Boolean(runs?.length) && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{T.previousMissions}</h2>
            <div className="divide-y rounded-xl border bg-card">
              {runs!.map((r) => {
                const plan = (r.plan ?? []) as AgentStep[];
                const steps = plan.filter((p) => p.status !== "skipped");
                return (
                  <Link key={r.id} href={`/tools/agent/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent">
                    {r.status === "done" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    ) : r.status === "error" ? (
                      <CircleAlert className="size-4 shrink-0 text-destructive" />
                    ) : (
                      <Clock className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.title ?? r.goal}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {steps.map((p, i) => (
                          <ToolIcon key={i} id={p.tool} className="size-3" />
                        ))}
                        <span className="ml-1">
                          {T.stepsDone(steps.filter((p) => p.status === "ok").length, steps.length)} · {dateL(r.created_at as string, lang)}
                        </span>
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
