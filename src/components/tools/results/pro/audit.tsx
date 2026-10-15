"use client";

import { BIO_LIMIT, scoreLabel, scoreTone, type AuditOutput } from "@/lib/addons/pro/specs/audit";
import { cn } from "@/lib/utils";
import { CopyButton, DataTable, Pill, Points, SectionCard, Timeline } from "./kit";

const TONE_TEXT = { good: "text-emerald-600 dark:text-emerald-400", warn: "text-amber-600 dark:text-amber-400", bad: "text-red-600 dark:text-red-400" } as const;
const TONE_BG = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500" } as const;
const TONE_STROKE = { good: "#10b981", warn: "#f59e0b", bad: "#ef4444" } as const;

function Gauge({ score }: { score: number }) {
  const tone = scoreTone(score, 100);
  const r = 80;
  const len = Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  return (
    <svg viewBox="0 0 200 116" className="w-full max-w-[240px]" role="img" aria-label={`Skor ${score} dari 100`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" className="text-muted" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={TONE_STROKE[tone]} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${len * pct} ${len}`} />
      <text x="100" y="88" textAnchor="middle" className="fill-foreground" style={{ fontSize: 40, fontWeight: 800 }}>
        {score}
      </text>
      <text x="100" y="108" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
        dari 100
      </text>
    </svg>
  );
}

export function AuditResult({ data }: { data: AuditOutput }) {
  const platform = data.platform === "tiktok" ? "tiktok" : "instagram";
  const limit = BIO_LIMIT[platform];
  const tone = scoreTone(data.score_total, 100);
  const highlights = data.highlights.filter((h) => h.type === "highlight");
  const pinned = data.highlights.filter((h) => h.type === "pinned");
  return (
    <div className="space-y-4">
      <section className="grid items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:grid-cols-[240px_1fr] sm:p-5">
        <div className="flex flex-col items-center">
          <Gauge score={data.score_total} />
          <p className={cn("mt-1 text-sm font-semibold", TONE_TEXT[tone])}>{scoreLabel(data.score_total)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Hasil audit {platform === "tiktok" ? "TikTok" : "Instagram"}</p>
          <h2 className="mt-1 text-lg font-bold">{data.verdict}</h2>
          <p className="mt-2 text-sm">{data.summary}</p>
        </div>
      </section>

      <SectionCard title="Skor per aspek" hint="Skor total = rata-rata 7 aspek × 10">
        <div className="space-y-2.5">
          {data.aspects.map((a) => {
            const t = scoreTone(a.score);
            return (
              <div key={a.key} className="grid grid-cols-[minmax(110px,180px)_1fr_44px] items-center gap-3 text-sm">
                <span className="truncate">{a.name}</span>
                <div className="h-2.5 rounded-full bg-muted">
                  <div className={cn("h-2.5 rounded-full", TONE_BG[t])} style={{ width: `${a.score * 10}%` }} />
                </div>
                <span className={cn("text-right font-semibold tabular-nums", TONE_TEXT[t])}>{a.score}/10</span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Temuan, bukti & perbaikan" hint="Klik aspek untuk detail">
        <div className="divide-y rounded-xl border">
          {data.aspects.map((a, i) => {
            const t = scoreTone(a.score);
            return (
              <details key={a.key} className="group p-3 print:break-inside-avoid" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-start gap-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white", TONE_BG[t])}>{a.score}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <b>{a.name}</b>
                      <Pill tone={a.priority === "tinggi" ? "bad" : a.priority === "sedang" ? "warn" : "muted"}>Prioritas {a.priority}</Pill>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{a.finding}</span>
                  </span>
                  <span className="shrink-0 text-xs text-primary group-open:hidden">Detail</span>
                </summary>
                <div className="mt-2 grid gap-2 pl-12 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <p className="mb-0.5 text-xs font-semibold text-muted-foreground">Bukti dari data</p>
                    <p>{a.evidence}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2.5">
                    <p className="mb-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Perbaikan</p>
                    <p>{a.fix}</p>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Pertahankan · Hentikan · Mulai">
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ["Pertahankan", data.keep, "bg-emerald-500/10", "text-emerald-700 dark:text-emerald-300", "✓"],
              ["Hentikan", data.stop, "bg-red-500/10", "text-red-700 dark:text-red-300", "✕"],
              ["Mulai", data.start, "bg-sky-500/10", "text-sky-700 dark:text-sky-300", "+"],
            ] as const
          ).map(([label, list, bg, fg, mark]) => (
            <div key={label} className={cn("rounded-xl p-3 text-sm", bg)}>
              <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", fg)}>{label}</p>
              <ul className="space-y-2">
                {list.map((x, i) => (
                  <li key={i}>
                    <b>
                      {mark} {x.item}
                    </b>
                    <p className="text-xs text-muted-foreground">{x.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Opsi bio baru" hint={`Maks ${limit} karakter (${platform === "tiktok" ? "TikTok" : "Instagram"})`}>
        <div className="grid gap-2 md:grid-cols-3">
          {data.bio_options.map((b, i) => {
            const chars = [...b.text].length;
            return (
              <div key={i} className="flex flex-col rounded-xl border bg-background p-3 print:break-inside-avoid">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Pill tone="primary">Opsi {i + 1}</Pill>
                  <CopyButton text={b.text} />
                </div>
                <p className="flex-1 whitespace-pre-line text-sm">{b.text}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{b.angle}</span>
                  <span className={cn("shrink-0 tabular-nums", chars > limit && "font-semibold text-red-600 dark:text-red-400")}>
                    {chars}/{limit}
                    {chars > limit && " · terlalu panjang"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title={platform === "tiktok" ? "Playlist & video pinned" : "Highlight & posting pinned"}>
        {!!highlights.length && (
          <div className="mb-4 flex gap-4 overflow-x-auto pb-1">
            {highlights.map((h, i) => (
              <div key={i} className="w-24 shrink-0 text-center" title={h.content}>
                <div className="mx-auto flex size-16 items-center justify-center rounded-full border-2 border-primary/40 bg-gradient-to-br from-primary/20 to-pink-500/20 p-1 text-lg font-bold text-primary">
                  {h.name.slice(0, 1).toUpperCase()}
                </div>
                <p className="mt-1 truncate text-xs font-medium">{h.name}</p>
              </div>
            ))}
          </div>
        )}
        <DataTable
          headers={["Jenis", "Nama", "Isi & tugasnya"]}
          rows={[...highlights, ...pinned].map((h) => [
            <Pill key="t" tone={h.type === "pinned" ? "warn" : "primary"}>
              {h.type === "pinned" ? "📌 Pinned" : platform === "tiktok" ? "Playlist" : "Highlight"}
            </Pill>,
            h.name,
            <span key="c" className="text-muted-foreground">
              {h.content}
            </span>,
          ])}
        />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <SectionCard title="Rencana 30 hari">
          <Timeline items={data.plan.map((w) => ({ title: w.focus, when: `Minggu ${w.week}`, body: <><Points items={w.actions} /><p className="mt-1 text-xs">Output: {w.output}</p></> }))} />
        </SectionCard>
        <SectionCard title="Target KPI 30 hari">
          <div className="space-y-2">
            {data.kpis.map((k) => (
              <div key={k.metric} className="rounded-lg border bg-background p-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{k.metric}</span>
                  <b className="text-primary">{k.target}</b>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sekarang: {k.baseline} · {k.how}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {!!data.assumptions.length && (
        <SectionCard title="Asumsi & data yang perlu dilengkapi">
          <Points items={data.assumptions} />
        </SectionCard>
      )}
    </div>
  );
}
