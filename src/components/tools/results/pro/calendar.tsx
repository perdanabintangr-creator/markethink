"use client";

import { useMemo, useState } from "react";
import type { CalendarOutput } from "@/lib/addons/pro/specs/calendar";
import { cn } from "@/lib/utils";
import { CopyCard, KeyValues, Pill, Points, SectionCard, StatGrid, Summary } from "./kit";

const COLORS = ["#6366f1", "#ec4899", "#0ea5e9", "#f59e0b", "#14b8a6", "#8b5cf6"];
const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function CalendarResult({ data }: { data: CalendarOutput }) {
  const color = (pillar: string) => COLORS[Math.max(0, data.pillars.findIndex((p) => p.name === pillar)) % COLORS.length];
  const month = data.posts[0]?.date.slice(0, 7) ?? "";
  const [selected, setSelected] = useState<string | null>(null);

  // Grid kalender (Senin di kiri).
  const cells = useMemo(() => {
    if (!month) return [];
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lead = (first + 6) % 7;
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  }, [month]);

  const shown = selected ? data.posts.filter((p) => p.date === selected) : data.posts;
  const platforms = [...new Set(data.posts.map((p) => p.platform))];

  return (
    <div className="space-y-4">
      <Summary text={data.summary} />

      <StatGrid
        items={[
          { label: "Total posting", value: String(data.posts.length), tone: "primary" },
          { label: "Pilar konten", value: String(data.pillars.length) },
          { label: "Platform", value: String(platforms.length), note: platforms.join(", ") },
          { label: "Momen penting", value: String(data.key_dates.length) },
        ]}
      />

      <SectionCard title="Strategi bulan ini">
        <KeyValues
          items={[
            { k: "Tujuan", v: data.strategy.objective },
            { k: "Insight audiens", v: data.strategy.insight },
            { k: "Sudut pandang", v: data.strategy.angle },
          ]}
        />
      </SectionCard>

      <SectionCard title="Pilar konten">
        <div className="mb-3 flex h-3 overflow-hidden rounded-full">
          {data.pillars.map((p, i) => (
            <div key={p.name} style={{ width: `${p.share_pct}%`, background: COLORS[i % COLORS.length] }} title={`${p.name} ${p.share_pct}%`} />
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.pillars.map((p, i) => (
            <div key={p.name} className="rounded-xl border bg-background p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <b className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {p.name}
                </b>
                <Pill tone="primary">{p.share_pct}%</Pill>
              </div>
              <p className="mt-1 text-muted-foreground">{p.purpose}</p>
              <div className="mt-2 flex flex-wrap gap-1">{p.formats.map((f) => <Pill key={f}>{f}</Pill>)}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Kalender" hint={selected ? <button className="text-primary hover:underline" onClick={() => setSelected(null)}>Tampilkan semua</button> : "Klik tanggal untuk melihat isinya"}>
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-1 text-xs">
            {DOW.map((d) => (
              <div key={d} className="py-1 text-center font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {cells.map((date, i) => {
              if (!date) return <div key={`x${i}`} />;
              const posts = data.posts.filter((p) => p.date === date);
              const moment = data.key_dates.find((k) => k.date === date);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(selected === date ? null : date)}
                  className={cn(
                    "min-h-20 rounded-lg border bg-background p-1.5 text-left align-top transition-colors hover:border-primary/50",
                    selected === date && "border-primary ring-1 ring-primary",
                    moment && "bg-amber-500/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{Number(date.slice(8))}</span>
                    {moment && <span title={moment.moment}>⭐</span>}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {posts.map((p, k) => (
                      <div key={k} className="truncate rounded px-1 py-0.5 text-[10px] text-white" style={{ background: color(p.pillar) }} title={p.title}>
                        {p.platform.slice(0, 2).toUpperCase()} · {p.format}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {!!data.key_dates.length && (
        <SectionCard title="Momen & tanggal penting">
          <div className="grid gap-2 sm:grid-cols-2">
            {data.key_dates.map((k) => (
              <div key={k.date + k.moment} className="rounded-xl border bg-background p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Pill tone="warn">{k.date.slice(8)}/{k.date.slice(5, 7)}</Pill>
                  <b>{k.moment}</b>
                </div>
                <p className="mt-1 text-muted-foreground">{k.idea}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title={selected ? `Konten tanggal ${Number(selected.slice(8))}` : "Semua konten & caption"} hint={`${shown.length} posting`}>
        <div className="divide-y rounded-xl border">
          {shown.map((p, i) => (
            <details key={i} className="group p-3 print:break-inside-avoid" open={Boolean(selected)}>
              <summary className="flex cursor-pointer list-none items-start gap-2">
                <span className="mt-0.5 size-2.5 shrink-0 rounded-full" style={{ background: color(p.pillar) }} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <b className="text-foreground">
                      {p.date.slice(8)}/{p.date.slice(5, 7)} · {p.time}
                    </b>
                    · {p.platform} · {p.format} · {p.pillar}
                  </span>
                  <span className="mt-0.5 block font-medium">{p.title}</span>
                  <span className="block text-sm text-muted-foreground">Hook: {p.hook}</span>
                </span>
                <span className="shrink-0 text-xs text-primary group-open:hidden">Lihat caption</span>
              </summary>
              <div className="mt-2 space-y-2 pl-4">
                <p className="text-xs text-muted-foreground">🎬 {p.visual}</p>
                <CopyCard
                  text={`${p.caption}\n\n${p.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`}
                  meta={<span>CTA: {p.cta}</span>}
                />
              </div>
            </details>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Target bulan ini">
          <div className="space-y-2">
            {data.kpis.map((k) => (
              <div key={k.metric} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                <span>{k.metric}</span>
                <b>{k.target}</b>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Alur kerja produksi">
          <Points items={data.workflow} />
        </SectionCard>
      </div>
    </div>
  );
}
