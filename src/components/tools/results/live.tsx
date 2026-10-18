"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MonitorPlay, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveOutput } from "@/lib/addons/schemas";
import { Bullets, CopyButton, SectionCard, useResultsI18n } from "../common";

/** Mode contekan: satu segmen per layar, huruf besar — untuk dibuka di HP/tablet saat live. */
function Prompter({ data, onClose }: { data: LiveOutput; onClose: () => void }) {
  const t = useResultsI18n().t.live;
  const [i, setI] = useState(0);
  const seg = data.segments[i];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(data.segments.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data.segments.length, onClose]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white">
      <div className="flex items-center justify-between px-4 py-3 text-sm text-white/60">
        <span>{t.segmentOf(i + 1, data.segments.length, seg.start_min, seg.end_min)}</span>
        <button type="button" onClick={onClose} aria-label={t.close} className="rounded-md p-1 hover:bg-white/10">
          <X />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-12">
        <p className="text-sm font-medium tracking-wide text-violet-300 uppercase">{seg.name}</p>
        <p className="mt-4 text-2xl leading-relaxed whitespace-pre-wrap sm:text-4xl sm:leading-relaxed">{seg.script}</p>
        <p className="mt-6 rounded-xl bg-violet-500/20 p-4 text-xl font-semibold text-violet-200 sm:text-2xl">👉 {seg.cta}</p>
        {seg.actions.length > 0 && <p className="mt-4 text-base text-white/60">{t.actions(seg.actions.join(" · "))}</p>}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 p-3">
        <Button variant="secondary" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
          <ChevronLeft /> {t.prev}
        </Button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-violet-400 transition-all" style={{ width: `${((i + 1) / data.segments.length) * 100}%` }} />
        </div>
        <Button onClick={() => setI((x) => Math.min(data.segments.length - 1, x + 1))} disabled={i === data.segments.length - 1}>
          {t.next} <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export function LiveResult({ data }: { data: LiveOutput }) {
  const t = useResultsI18n().t.live;
  const [prompter, setPrompter] = useState(false);
  const total = Math.max(...data.segments.map((s) => s.end_min), 1);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div>
          <p className="font-semibold">{data.title}</p>
          <p className="text-sm text-muted-foreground">{t.stats(data.segments.length, total, data.flash_sales.length)}</p>
        </div>
        <Button onClick={() => setPrompter(true)} className="print:hidden">
          <MonitorPlay /> {t.prompter}
        </Button>
      </div>

      <SectionCard title={t.hooks}>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.opening_hooks.map((h, i) => (
            <div key={i} className="flex items-start justify-between gap-2 rounded-lg border bg-background p-3 text-sm">
              <span>“{h}”</span>
              <CopyButton text={h} label="" className="shrink-0 px-1.5" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.rundown} hint={t.rundownHint}>
        <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-muted print:hidden" aria-hidden>
          {data.segments.map((s, i) => (
            <div
              key={i}
              title={s.name}
              className={i % 2 ? "bg-primary/60" : "bg-primary"}
              style={{ width: `${((s.end_min - s.start_min) / total) * 100}%` }}
            />
          ))}
        </div>
        <ol className="relative space-y-3 border-l pl-5">
          {data.segments.map((s, i) => {
            const flash = data.flash_sales.filter((f) => f.at_min >= s.start_min && f.at_min < s.end_min);
            return (
              <li key={i} className="relative">
                <span className="absolute top-1 -left-[27px] flex size-3 rounded-full border-2 border-background bg-primary" />
                <details className="group rounded-xl border bg-background p-3 open:bg-accent/30" open={i === 0}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                      {s.start_min}-{s.end_min}′
                    </span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">· {s.goal}</span>
                    {flash.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        <Zap className="size-3" /> {t.flashSale}
                      </span>
                    )}
                  </summary>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="whitespace-pre-wrap">{s.script}</p>
                    {s.actions.length > 0 && <p className="text-xs text-muted-foreground">🎬 {s.actions.join(" · ")}</p>}
                    <p className="font-medium text-primary">👉 {s.cta}</p>
                    {flash.map((f, k) => (
                      <div key={k} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
                        <b>{t.flashAt(f.at_min)} {f.offer}</b>
                        <p className="mt-1">{f.script}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </SectionCard>

      <SectionCard title={t.objections}>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.objections.map((o, i) => (
            <div key={i} className="rounded-lg border bg-background p-3 text-sm">
              <p className="font-medium">“{o.objection}”</p>
              <p className="mt-1 text-muted-foreground">{o.answer}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title={t.closing}>
          <Bullets items={data.closing_lines} />
        </SectionCard>
        <SectionCard title={t.tips}>
          <Bullets items={data.tips} />
        </SectionCard>
      </div>
      {prompter && <Prompter data={data} onClose={() => setPrompter(false)} />}
    </div>
  );
}
