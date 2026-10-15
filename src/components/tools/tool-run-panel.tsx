"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilesBar } from "@/components/tools/common";
import { ResultView } from "@/components/tools/result-view";
import { ToolIcon } from "@/components/tools/tool-icon";
import { WorkingShowcase } from "@/components/tools/working-showcase";
import { toolInfo } from "@/lib/addons/catalog";
import { dateID, type ToolFileLite } from "@/lib/addons/format";

export const REVISE_STEPS = [
  "Membaca permintaanmu di chat",
  "Menyesuaikan data & asumsi",
  "Menulis ulang bagian yang berubah",
  "Mengecek angka & konsistensi",
  "Menyusun ulang PPT & Excel",
  "Sentuhan akhir",
];

interface RunData {
  run: { id: string; tool: string; title: string | null; input: Record<string, unknown>; output: unknown; files: ToolFileLite[]; created_at: string };
  version: number;
  revisionsLeft: number;
}

/**
 * Panel kanan di chat "Bahas di Chat": menampilkan versi TERBARU hasil Tools Pro.
 * Saat AI memperbarui hasil dari percakapan, panel menampilkan progres lalu memuat versi baru.
 */
export function ToolRunPanel({
  rootId,
  refreshKey,
  updating,
  onClose,
  onLoaded,
}: {
  rootId: string;
  refreshKey: number;
  updating: { since: number } | null;
  onClose: () => void;
  onLoaded?: (d: RunData) => void;
}) {
  const [data, setData] = useState<RunData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setError(false);
    void fetch(`/api/tools/runs/${rootId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: RunData) => {
        if (!alive) return;
        setData(d);
        onLoaded?.(d);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootId, refreshKey]);

  const info = data ? toolInfo(data.run.tool) : null;

  return (
    <div className="relative flex h-full flex-col bg-background">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {data && <ToolIcon id={data.run.tool} className="size-4 shrink-0 text-primary" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{data?.run.title ?? "Hasil Tools Pro"}</p>
          {data && (
            <p className="text-[11px] text-muted-foreground">
              {info?.name} · Versi {data.version}
              {data.version > 1 ? " (terbaru)" : ""} · {dateID(data.run.created_at)}
            </p>
          )}
        </div>
        {data && (
          <Button asChild variant="ghost" size="icon" title="Buka halaman penuh">
            <Link href={`/tools/${data.run.tool}/${data.run.id}`}>
              <ExternalLink />
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup panel">
          <X />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        {!data && !error && <Loader2 className="mx-auto mt-10 size-6 animate-spin text-muted-foreground" />}
        {error && <p className="mt-10 text-center text-sm text-muted-foreground">Hasil tidak bisa dimuat.</p>}
        {data && (
          <div className="space-y-4">
            <FilesBar files={data.run.files ?? []} />
            <ResultView tool={data.run.tool} output={data.run.output} input={data.run.input ?? {}} />
          </div>
        )}
      </div>

      {updating && (
        <div className="absolute inset-x-0 top-12 bottom-0 z-10 flex items-center justify-center overflow-y-auto bg-background/90 p-6 backdrop-blur-sm">
          <WorkingShowcase
            key={updating.since}
            tool={data?.run.tool}
            since={updating.since}
            typical={Math.max(90, info?.seconds ?? 90)}
            title="Meracik versi baru untukmu…"
            note="Versi baru (termasuk PPT/Excel) langsung muncul di sini."
            steps={REVISE_STEPS}
          />
        </div>
      )}
    </div>
  );
}
