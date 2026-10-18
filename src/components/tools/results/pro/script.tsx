"use client";

import { useState } from "react";
import { scriptText, tag, type ScriptItem, type ScriptOutput } from "@/lib/addons/pro/specs/script";
import { cn } from "@/lib/utils";
import { CardGrid, CopyButton, CopyCard, KeyValues, Pill, SectionCard, StatGrid, Summary, useResultsI18n } from "./kit";

const COLORS = ["#2563eb", "#ec4899", "#0ea5e9", "#f59e0b", "#14b8a6", "#8b5cf6", "#ef4444", "#22c55e", "#64748b"];

export function ScriptResult({ data }: { data: ScriptOutput }) {
  const t = useResultsI18n().t.script;
  const duration = data.scripts[0]?.scenes.at(-1)?.end ?? 0;
  const hooks = data.scripts.reduce((s, x) => s + x.hooks.length, 0);
  const scenes = data.scripts.reduce((s, x) => s + x.scenes.length, 0);
  return (
    <div className="space-y-4">
      <Summary text={data.summary} />

      <StatGrid
        items={[
          { label: t.scripts, value: String(data.scripts.length), tone: "primary" },
          { label: t.duration, value: duration ? t.secs(duration) : "-" },
          { label: t.hookVariations, value: String(hooks), note: t.toTest },
          { label: t.totalScenes, value: String(scenes), note: t.shotList },
        ]}
      />

      {data.scripts.map((s, i) => (
        <ScriptCard key={i} s={s} index={i} />
      ))}

      {!!data.tips.length && (
        <SectionCard title={t.tips}>
          <CardGrid items={data.tips.map((x) => ({ title: x.title, body: x.detail }))} cols={3} />
        </SectionCard>
      )}
    </div>
  );
}

function ScriptCard({ s, index }: { s: ScriptItem; index: number }) {
  const t = useResultsI18n().t.script;
  const [active, setActive] = useState<number | null>(null);
  const total = Math.max(1, s.scenes.at(-1)?.end ?? 1);
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5 print:break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t.scriptN(index + 1)}</p>
          <h2 className="mt-0.5 text-lg font-bold">{s.title}</h2>
          <div className="mt-1 flex flex-wrap gap-1">
            <Pill tone="primary">{s.style}</Pill>
            <Pill>{t.secs(total)}</Pill>
            <Pill>{t.nScenes(s.scenes.length)}</Pill>
          </div>
        </div>
        <CopyButton text={scriptText(s)} label={t.copyFull} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        <b className="text-foreground">{t.angle}</b> {s.angle}
      </p>

      <h3 className="mb-2 mt-4 text-sm font-semibold">{t.hookChoices}</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        {s.hooks.map((h, k) => (
          <div key={k} className="rounded-xl border bg-background p-3 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <Pill tone={k === 0 ? "good" : "muted"}>Hook {String.fromCharCode(65 + k)}</Pill>
              <CopyButton text={h.text} />
            </div>
            <p className="font-medium">&ldquo;{h.text}&rdquo;</p>
            <p className="mt-1 text-xs text-muted-foreground">🎬 {h.visual}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-2 mt-4 text-sm font-semibold">{t.sceneTimeline}</h3>
      <div className="flex h-8 overflow-hidden rounded-lg text-[10px] font-medium text-white">
        {s.scenes.map((sc, k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActive(active === k ? null : k)}
            title={sc.shot}
            className={cn("flex items-center justify-center border-r border-white/40 transition-opacity last:border-r-0", active !== null && active !== k && "opacity-40")}
            style={{ width: `${((sc.end - sc.start) / total) * 100}%`, background: COLORS[k % COLORS.length] }}
          >
            <span className="truncate px-1">{sc.time.replace(" dtk", "s")}</span>
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{t.secs(0)}</span>
        <span>{t.secs(total)}</span>
      </div>

      <div className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-2 print:flex-wrap">
        {s.scenes.map((sc, k) => (
          <article
            key={k}
            onClick={() => setActive(active === k ? null : k)}
            className={cn(
              "w-48 shrink-0 cursor-pointer snap-start rounded-xl border bg-background p-2 text-xs transition-shadow print:break-inside-avoid",
              active === k && "ring-2 ring-primary",
            )}
          >
            <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-lg p-2 text-white" style={{ background: `linear-gradient(160deg, ${COLORS[k % COLORS.length]}, #111827)` }}>
              <div className="flex items-center justify-between">
                <span className="rounded bg-black/40 px-1.5 py-0.5 font-semibold">#{k + 1}</span>
                <span className="rounded bg-black/40 px-1.5 py-0.5 tabular-nums">{sc.time}</span>
              </div>
              <p className="line-clamp-4 text-[11px] leading-snug text-white/85">{sc.shot}</p>
              {sc.on_screen ? (
                <p className="rounded bg-white/90 px-1.5 py-1 text-center text-[11px] font-bold leading-tight text-gray-900">{sc.on_screen}</p>
              ) : (
                <span />
              )}
            </div>
            <div className="mt-2 space-y-1.5">
              {sc.voice_over && (
                <p>
                  <span className="font-semibold text-muted-foreground">VO: </span>
                  {sc.voice_over}
                </p>
              )}
              {sc.audio && <p className="text-muted-foreground">🎵 {sc.audio}</p>}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <CopyCard title="Caption" text={`${s.caption}\n\n${s.hashtags.map(tag).join(" ")}`} meta={<span>CTA: {s.cta}</span>} />
        <div className="rounded-xl bg-primary/5 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold text-primary">{t.why}</p>
          <p>{s.why}</p>
        </div>
      </div>

      <details className="group mt-3 rounded-xl border p-3">
        <summary className="cursor-pointer list-none text-sm font-medium">
          {t.shooting} <span className="text-xs text-primary group-open:hidden">{t.view}</span>
        </summary>
        <div className="mt-2">
          <KeyValues
            items={[
              { k: t.props, v: s.props },
              { k: t.editing, v: s.editing },
            ]}
          />
        </div>
      </details>
    </section>
  );
}
