"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, CircleDashed, Loader2, MessageSquareText, Play, RotateCcw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/chat/markdown";
import { FilesBar } from "@/components/tools/common";
import { ToolIcon } from "@/components/tools/tool-icon";
import { WorkingShowcase } from "@/components/tools/working-showcase";
import { toolInfo } from "@/lib/addons/catalog";
import { PRO_FORMS } from "@/lib/addons/pro/forms";
import { TOOL_CREDIT_ESTIMATE, type ToolFileLite } from "@/lib/addons/format";
import type { AgentRunLite, AgentStep } from "@/lib/agent/catalog";
import { emitChatsChanged } from "@/lib/events";
import { cn } from "@/lib/utils";

interface ResultLite {
  id: string;
  tool: string;
  title: string | null;
  files: ToolFileLite[] | null;
  status: string;
}

const SUMMARY_STEPS = ["Membaca semua hasil", "Menarik benang merah strategi", "Menyusun rencana eksekusi", "Menentukan angka yang dipantau"];

const stepLabels = (tool: string) => [
  "Membaca tujuan & hasil langkah sebelumnya",
  "Mengisi brief otomatis",
  ...(PRO_FORMS[tool]?.steps ?? ["Riset & analisis", "Menyusun hasil", "Membuat PPT & Excel"]),
];

/** Halaman misi Agent: rencana → jalankan langkah satu per satu (tiap langkah = satu Tools Pro) → ringkasan paket. */
export function AgentMission({ initial, initialResults }: { initial: AgentRunLite; initialResults: ResultLite[] }) {
  const router = useRouter();
  const [run, setRun] = useState(initial);
  const [results, setResults] = useState(initialResults);
  const [working, setWorking] = useState<{ index: number; since: number } | null>(null);
  const [summarizing, setSummarizing] = useState<number | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const stopRef = useRef(false);
  const loopRef = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/agent/${initial.id}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { run: AgentRunLite; results: ResultLite[] };
    setRun(data.run);
    setResults(data.results);
    return data.run;
  }, [initial.id]);

  const active = run.plan.filter((p) => p.status !== "skipped");
  const pending = run.plan.some((p) => p.status === "pending");
  const runningIdx = run.plan.findIndex((p) => p.status === "running");
  const okCount = run.plan.filter((p) => p.status === "ok").length;
  const totalSeconds = active.reduce((sum, p) => sum + (toolInfo(p.tool)?.seconds ?? 90) + 20, 0);

  const finish = useCallback(async () => {
    setSummarizing(Date.now());
    try {
      const res = await fetch(`/api/agent/${initial.id}/finish`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(data.message ?? "Gagal menyusun ringkasan. Coba lagi.");
      else toast.success("Paket selesai! 🎉");
    } finally {
      setSummarizing(null);
      await refresh();
    }
  }, [initial.id, refresh]);

  /** Jalankan langkah berikutnya terus sampai habis (satu permintaan per langkah). */
  const runAll = useCallback(
    async (retry?: number) => {
      if (loopRef.current) return;
      loopRef.current = true;
      stopRef.current = false;
      try {
        let next: number | undefined = retry;
        for (let guard = 0; guard < 8 && !stopRef.current; guard++) {
          const current = await refresh();
          if (!current) break;
          const idx = next ?? current.plan.findIndex((p) => p.status === "pending");
          if (idx === -1 || idx === undefined) break;
          setWorking({ index: idx, since: Date.now() });
          const res = await fetch(`/api/agent/${initial.id}/step`, {
            method: "POST",
            body: JSON.stringify(next !== undefined ? { retry: next } : {}),
          });
          next = undefined;
          const data = await res.json().catch(() => ({}));
          if (res.status === 409) {
            toast.message(data.message ?? "Langkah sebelumnya masih berjalan, tunggu sebentar.");
            break;
          }
          if (!res.ok) {
            toast.error(data.message ?? "Koneksi terputus. Klik Lanjutkan untuk meneruskan.");
            break;
          }
          if (data.done) break;
          if (data.ok) toast.success(`${toolInfo(current.plan[idx].tool)?.name ?? "Langkah"} selesai`);
          else toast.error(data.error ?? "Langkah gagal.");
          emitChatsChanged();
          if (!data.more) break;
        }
      } catch {
        toast.error("Koneksi terputus. Klik Lanjutkan untuk meneruskan.");
      } finally {
        setWorking(null);
        loopRef.current = false;
      }
      const after = await refresh();
      if (after && !after.summary && !after.plan.some((p) => p.status === "pending" || p.status === "running") && after.plan.some((p) => p.status === "ok")) {
        await finish();
      }
    },
    [initial.id, refresh, finish],
  );

  // Kembali ke halaman saat langkah masih diproses server → pantau sampai selesai.
  useEffect(() => {
    if (runningIdx === -1 || working) return;
    const t = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(t);
  }, [runningIdx, working, refresh]);

  useEffect(() => () => void (stopRef.current = true), []);

  async function removeStep(i: number) {
    const res = await fetch(`/api/agent/${initial.id}`, { method: "PATCH", body: JSON.stringify({ remove: i }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return void toast.error(data.message ?? "Gagal membuang langkah.");
    await refresh();
  }

  async function openChat() {
    setChatBusy(true);
    try {
      const res = await fetch(`/api/agent/${initial.id}/to-chat`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.chatId) return void toast.error("Gagal membuka chat. Coba lagi.");
      emitChatsChanged();
      router.push(`/chat/${data.chatId}`);
    } finally {
      setChatBusy(false);
    }
  }

  const resultFor = (step: AgentStep) => results.find((r) => r.id === step.run_id);
  const busy = Boolean(working) || summarizing !== null;
  const notStarted = run.plan.every((p) => p.status === "pending" || p.status === "skipped");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Markethink Agent</p>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">{run.title ?? "Misi baru"}</h1>
        <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">{run.goal}</blockquote>
        {notStarted && !busy && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/5 p-3">
            <p className="text-sm">
              <span className="font-medium">{active.length} langkah</span> · ±{active.length * (TOOL_CREDIT_ESTIMATE[run.tier ?? "senior"])} kredit · ±{Math.ceil(totalSeconds / 60)} menit.
              <span className="block text-xs text-muted-foreground">Buang langkah yang tidak perlu (✕), lalu jalankan. Biarkan halaman ini terbuka selama Agent bekerja.</span>
            </p>
            <Button onClick={() => void runAll()}>
              <Play /> Jalankan semua langkah
            </Button>
          </div>
        )}
        {!notStarted && pending && !busy && runningIdx === -1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/5 p-3">
            <p className="text-sm">Masih ada langkah yang belum dijalankan.</p>
            <Button onClick={() => void runAll()}>
              <Play /> Lanjutkan
            </Button>
          </div>
        )}
      </div>

      <ol className="space-y-3">
        {run.plan.map((step, i) => {
          if (step.status === "skipped") return null;
          const info = toolInfo(step.tool);
          const result = resultFor(step);
          const isWorking = working?.index === i || (step.status === "running" && !working);
          const n = active.indexOf(step) + 1;
          return (
            <li key={`${step.tool}-${i}`} className={cn("rounded-2xl border bg-card p-4 transition-colors", isWorking && "border-primary/50 ring-1 ring-primary/30")}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ToolIcon id={step.tool} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {n}. {info?.name ?? step.tool}
                    </p>
                    <StepBadge status={isWorking ? "running" : step.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.why}</p>
                  {step.status === "ok" && result && (
                    <div className="mt-3 space-y-2">
                      <Link href={`/tools/${result.tool}/${result.id}`} className="text-sm font-medium text-primary hover:underline">
                        {result.title ?? info?.name} →
                      </Link>
                      <FilesBar files={result.files ?? []} />
                    </div>
                  )}
                  {step.status === "error" && !isWorking && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <p className="text-sm text-destructive">{step.error}</p>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void runAll(i)}>
                        <RotateCcw /> Ulangi langkah ini
                      </Button>
                    </div>
                  )}
                </div>
                {step.status === "pending" && notStarted && !busy && active.length > 1 && (
                  <button onClick={() => void removeStep(i)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Buang langkah" title="Buang langkah">
                    <X className="size-4" />
                  </button>
                )}
              </div>
              {isWorking && (
                <div className="mt-4 flex justify-center border-t pt-5">
                  <WorkingShowcase
                    key={`${i}-${working?.since ?? "srv"}`}
                    tool={step.tool}
                    since={working?.since}
                    typical={(info?.seconds ?? 90) + 20}
                    title={`Langkah ${n} dari ${active.length}: ${info?.menu ?? "memproses"}…`}
                    note="Jangan tutup halaman ini — langkah berikutnya otomatis lanjut."
                    steps={stepLabels(step.tool)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {summarizing !== null && (
        <div className="flex justify-center rounded-2xl border bg-card p-6">
          <WorkingShowcase tool="agent" since={summarizing} typical={45} title="Merangkai semua hasil jadi satu paket…" steps={SUMMARY_STEPS} />
        </div>
      )}

      {run.summary && (
        <section className="rounded-2xl border bg-card p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="size-5 text-primary" /> Ringkasan paket
            </h2>
            <Button onClick={openChat} disabled={chatBusy}>
              {chatBusy ? <Loader2 className="animate-spin" /> : <MessageSquareText />} Bahas paket di Chat
            </Button>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <Markdown>{run.summary}</Markdown>
          </div>
        </section>
      )}

      {!run.summary && !busy && !pending && runningIdx === -1 && okCount > 0 && (
        <div className="flex justify-center">
          <Button onClick={() => void finish()}>
            <Sparkles /> Susun ringkasan paket
          </Button>
        </div>
      )}
    </div>
  );
}

function StepBadge({ status }: { status: AgentStep["status"] }) {
  const map = {
    pending: { icon: <CircleDashed className="size-3.5" />, label: "Menunggu", cls: "text-muted-foreground" },
    running: { icon: <Loader2 className="size-3.5 animate-spin" />, label: "Dikerjakan", cls: "text-primary" },
    ok: { icon: <CheckCircle2 className="size-3.5" />, label: "Selesai", cls: "text-emerald-600 dark:text-emerald-400" },
    error: { icon: <CircleAlert className="size-3.5" />, label: "Gagal", cls: "text-destructive" },
    skipped: { icon: null, label: "Dilewati", cls: "text-muted-foreground" },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", map.cls)}>
      {map.icon} {map.label}
    </span>
  );
}
