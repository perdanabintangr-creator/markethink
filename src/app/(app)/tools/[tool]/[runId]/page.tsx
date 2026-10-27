import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, RotateCcw } from "lucide-react";
import { getSession, requireUser } from "@/lib/auth";
import { toolInfoL } from "@/lib/addons/i18n";
import { dateL, toolsText } from "@/lib/i18n/tools";
import { Button } from "@/components/ui/button";
import { FilesBar } from "@/components/tools/common";
import type { ToolFileLite } from "@/lib/addons/format";
import { ResultView } from "@/components/tools/result-view";
import { ToolIcon } from "@/components/tools/tool-icon";
import { DiscussInChat, ReviseButton } from "@/components/tools/run-discussion";
import { ResearchNotes } from "@/components/tools/research-notes";
import { MAX_REVISIONS } from "@/lib/addons/format";
import { WatchButton, WatchChanges } from "@/components/tools/watch-button";
import { isWatchable } from "@/lib/addons/watchers";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { profile } = await getSession();
  return { title: toolsText(profile?.language).resultMetaTitle };
}

export default async function ToolResultPage({ params }: { params: Promise<{ tool: string; runId: string }> }) {
  const { tool, runId } = await params;
  const { supabase, profile } = await requireUser();
  const lang = profile.language;
  const T = toolsText(lang);
  const info = toolInfoL(tool, lang);
  if (!info || !/^[0-9a-f-]{36}$/i.test(runId)) notFound();
  const { data: run } = await supabase
    .from("tool_runs")
    .select("id, tool, title, status, source, input, output, files, error, created_at, revision_of, revision_note")
    .eq("id", runId)
    .eq("tool", tool)
    .maybeSingle();
  if (!run) notFound();
  const root = (run.revision_of as string | null) ?? run.id;
  const { count: revisions } = await supabase
    .from("tool_runs")
    .select("id", { count: "exact", head: true })
    .eq("revision_of", root)
    .neq("status", "error");

  return (
    <div className="h-full overflow-y-auto print:h-auto print:overflow-visible">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/tools/${tool}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {info.name}
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/tools/${tool}`}>
              <RotateCcw /> {T.createNew}
            </Link>
          </Button>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary print:hidden">
            <ToolIcon id={tool} className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {info.name} · {dateL(run.created_at, lang)} · {run.revision_of ? T.revisionFree : (T.sourceLabel[run.source] ?? run.source)}
            </p>
            <h1 className="text-xl font-bold sm:text-2xl">{run.title ?? info.name}</h1>
          </div>
        </div>

        {run.revision_of && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm print:hidden">
            <p>
              {T.revisionOf}{" "}
              <Link href={`/tools/${tool}/${run.revision_of}`} className="font-medium text-primary hover:underline">
                {T.previousResult}
              </Link>
              {T.corrected}
            </p>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{run.revision_note}</p>
          </div>
        )}

        {run.status === "ok" && run.output ? (
          <>
            <DiscussInChat runId={run.id} />
            <div className="flex flex-wrap items-center gap-2">
              <FilesBar files={(run.files ?? []) as ToolFileLite[]} />
              <ReviseButton runId={run.id} tool={tool} revisionsLeft={Math.max(0, MAX_REVISIONS - (revisions ?? 0))} />
              {isWatchable(tool) && <WatchButton runId={run.id} />}
            </div>
            <WatchChanges output={run.output} />
            <ResultView tool={tool} output={run.output} input={(run.input ?? {}) as Record<string, unknown>} runId={run.id} />
            <ResearchNotes output={run.output} />
            <p className="pt-2 text-center text-xs text-muted-foreground">{T.madeWith}</p>
          </>
        ) : run.status === "error" ? (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <CircleAlert className="mt-0.5 size-5 text-destructive" />
            <div>
              <p className="font-medium">{T.runFailed}</p>
              <Link href={`/tools/${tool}`} className="mt-1 inline-block text-primary hover:underline">
                {T.tryAgain}
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{T.stillProcessing}</p>
        )}
      </div>
    </div>
  );
}
