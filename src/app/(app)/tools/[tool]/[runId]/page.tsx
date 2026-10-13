import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, RotateCcw } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { toolInfo } from "@/lib/addons/catalog";
import { Button } from "@/components/ui/button";
import { FilesBar } from "@/components/tools/common";
import { dateID, type ToolFileLite } from "@/lib/addons/format";
import { ResultView } from "@/components/tools/result-view";
import { ToolIcon } from "@/components/tools/tool-icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hasil Tools Pro" };

const SOURCE_LABEL: Record<string, string> = { trial: "Percobaan gratis", promax: "Jatah Promax", paid: "Add-on", admin: "Admin" };

export default async function ToolResultPage({ params }: { params: Promise<{ tool: string; runId: string }> }) {
  const { tool, runId } = await params;
  const info = toolInfo(tool);
  if (!info || !/^[0-9a-f-]{36}$/i.test(runId)) notFound();
  const { supabase } = await requireUser();
  const { data: run } = await supabase
    .from("tool_runs")
    .select("id, tool, title, status, source, input, output, files, error, created_at")
    .eq("id", runId)
    .eq("tool", tool)
    .maybeSingle();
  if (!run) notFound();

  return (
    <div className="h-full overflow-y-auto print:h-auto print:overflow-visible">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/tools/${tool}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {info.name}
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/tools/${tool}`}>
              <RotateCcw /> Buat baru
            </Link>
          </Button>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary print:hidden">
            <ToolIcon id={tool} className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {info.name} · {dateID(run.created_at)} · {SOURCE_LABEL[run.source] ?? run.source}
            </p>
            <h1 className="text-xl font-bold sm:text-2xl">{run.title ?? info.name}</h1>
          </div>
        </div>

        {run.status === "ok" && run.output ? (
          <>
            <FilesBar files={(run.files ?? []) as ToolFileLite[]} />
            <ResultView tool={tool} output={run.output} input={(run.input ?? {}) as Record<string, unknown>} />
            <p className="pt-2 text-center text-xs text-muted-foreground">Dibuat dengan Markethink Tools Pro · cek ulang angka & klaim sebelum dipublikasikan.</p>
          </>
        ) : run.status === "error" ? (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <CircleAlert className="mt-0.5 size-5 text-destructive" />
            <div>
              <p className="font-medium">Hasil gagal dibuat — kuota kamu tidak terpotong.</p>
              <Link href={`/tools/${tool}`} className="mt-1 inline-block text-primary hover:underline">
                Coba lagi
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Masih diproses… muat ulang halaman ini sebentar lagi.</p>
        )}
      </div>
    </div>
  );
}
