"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useResultLang } from "./common";

const TEXT = {
  id: {
    watch: "Pantau tiap minggu",
    watching: (d: string) => `Dipantau mingguan · berikutnya ${d}`,
    stop: "Berhenti memantau",
    started: "Siap! Markethink menjalankan ulang analisis ini tiap minggu & mengirim ringkasan perubahannya ke email kamu.",
    stopped: "Pemantauan dihentikan.",
    hint: "Riset ulang otomatis tiap 7 hari, memakai kuota seperti biasa.",
    failed: "Gagal. Coba lagi.",
    changes: "📈 Yang berubah sejak pemantauan sebelumnya",
  },
  en: {
    watch: "Monitor weekly",
    watching: (d: string) => `Monitored weekly · next on ${d}`,
    stop: "Stop monitoring",
    started: "Done! Markethink will re-run this analysis every week and email you a summary of what changed.",
    stopped: "Monitoring stopped.",
    hint: "Automatic re-research every 7 days, using your quota as usual.",
    failed: "Failed. Please try again.",
    changes: "📈 What changed since the last check",
  },
};

interface Watcher {
  id: string;
  next_run_at: string;
}

/** Tombol "Pantau tiap minggu" di halaman hasil (Analisis Kompetitor & Audit Akun). */
export function WatchButton({ runId }: { runId: string }) {
  const lang = useResultLang();
  const W = TEXT[lang === "en" ? "en" : "id"];
  const [watcher, setWatcher] = useState<Watcher | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/tools/runs/${runId}/watch`)
      .then((r) => (r.ok ? r.json() : { watcher: null }))
      .then((d) => setWatcher(d.watcher ?? null))
      .catch(() => setWatcher(null));
  }, [runId]);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tools/runs/${runId}/watch`, { method: watcher ? "DELETE" : "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.message ?? W.failed);
      if (watcher) {
        setWatcher(null);
        toast(W.stopped);
      } else {
        setWatcher(data?.watcher ?? null);
        toast.success(W.started);
      }
    } finally {
      setBusy(false);
    }
  }

  if (watcher === undefined) return null;
  const next = watcher ? new Date(watcher.next_run_at).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" }) : "";
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button size="sm" variant={watcher ? "secondary" : "outline"} className="rounded-full" disabled={busy} onClick={() => void toggle()} title={watcher ? W.stop : W.hint}>
        {busy ? <Loader2 className="animate-spin" /> : watcher ? <BellOff /> : <BellRing />} {watcher ? W.stop : W.watch}
      </Button>
      {watcher && <span className="text-xs text-emerald-700 dark:text-emerald-400">{W.watching(next)}</span>}
    </span>
  );
}

/** Ringkasan perubahan yang ditulis pemantauan mingguan pada hasil terbaru. */
export function WatchChanges({ output }: { output: unknown }) {
  const lang = useResultLang();
  const W = TEXT[lang === "en" ? "en" : "id"];
  const changes = (output as { watch_changes?: unknown } | null)?.watch_changes;
  if (!Array.isArray(changes) || !changes.length) return null;
  return (
    <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4">
      <p className="flex items-center gap-1.5 font-semibold">
        <Sparkles className="size-4 text-emerald-600" /> {W.changes}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {changes.map((c, i) => (
          <li key={i}>{String(c)}</li>
        ))}
      </ul>
    </section>
  );
}
