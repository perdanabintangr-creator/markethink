"use client";

import { useState } from "react";
import { FORMAT_LABEL, PLATFORM_LABEL, variantText, type AdVariant, type AdcopyOutput } from "@/lib/addons/pro/specs/adcopy";
import { cn } from "@/lib/utils";
import { CopyButton, DataTable, KeyValues, Pill, SectionCard, StatGrid, Summary } from "./kit";

const COLORS = ["#6366f1", "#ec4899", "#0ea5e9", "#f59e0b", "#14b8a6", "#8b5cf6"];
const RULE = { kill: { label: "Matikan", tone: "bad" }, scale: { label: "Naikkan", tone: "good" }, iterate: { label: "Perbaiki", tone: "warn" } } as const;
const chars = (s: string) => [...s].length;

export function AdcopyResult({ data, brand }: { data: AdcopyOutput; brand?: string }) {
  const platform = data.platform ?? (data.variants.every((v) => v.format === "search") ? "google" : "meta");
  const name = brand?.trim() || "Brand kamu";
  const [angle, setAngle] = useState<string | null>(null);
  const color = (a: string) => COLORS[Math.max(0, data.angles.findIndex((x) => x.name === a)) % COLORS.length];
  const shown = angle ? data.variants.filter((v) => v.angle === angle) : data.variants;
  const formats = [...new Set(data.variants.map((v) => FORMAT_LABEL[v.format]))];
  const flagged = data.variants.filter((v) => v.flags?.length).length;
  return (
    <div className="space-y-4">
      <Summary text={data.strategy.summary} />

      <StatGrid
        items={[
          { label: "Variasi iklan", value: String(data.variants.length), tone: "primary", note: PLATFORM_LABEL[platform] },
          { label: "Angle diuji", value: String(data.angles.length) },
          { label: "Format", value: String(formats.length), note: formats.join(", ") },
          { label: "Perlu dicek", value: String(flagged), tone: flagged ? "warn" : "good", note: flagged ? "batas karakter/aturan" : "semua aman" },
        ]}
      />

      <SectionCard title="Strategi">
        <KeyValues
          items={[
            { k: "Insight audiens", v: data.strategy.insight },
            { k: "Funnel & setelah klik", v: data.strategy.funnel },
          ]}
        />
      </SectionCard>

      <SectionCard title="Angle yang diuji" hint="Klik angle untuk menyaring variasi">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.angles.map((a) => {
            const n = data.variants.filter((v) => v.angle === a.name).length;
            return (
              <button
                key={a.name}
                type="button"
                onClick={() => setAngle(angle === a.name ? null : a.name)}
                className={cn("rounded-xl border bg-background p-3 text-left text-sm transition-colors hover:border-primary/50", angle === a.name && "border-primary ring-1 ring-primary")}
              >
                <div className="flex items-center justify-between gap-2">
                  <b className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: color(a.name) }} />
                    {a.name}
                  </b>
                  <Pill>{n} variasi</Pill>
                </div>
                <p className="mt-1 text-muted-foreground">{a.why}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={angle ? `Variasi: ${angle}` : "Semua variasi iklan"}
        hint={angle ? <button className="text-primary hover:underline" onClick={() => setAngle(null)}>Tampilkan semua</button> : `${shown.length} variasi · mockup tampilan iklan`}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((v) => (
            <div key={v.code} className="flex flex-col gap-2 print:break-inside-avoid">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <Pill tone="primary">{v.code}</Pill>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: color(v.angle) }}>
                    {v.angle}
                  </span>
                  <Pill>{FORMAT_LABEL[v.format]}</Pill>
                </div>
                <CopyButton text={variantText(v, platform)} label="Salin variasi" />
              </div>
              {platform === "google" ? <GoogleMock v={v} name={name} /> : platform === "tiktok" ? <TiktokMock v={v} name={name} /> : platform === "shopee" ? <ShopeeMock v={v} name={name} /> : <MetaMock v={v} name={name} />}
              <div className="space-y-1 rounded-xl border bg-background p-3 text-xs">
                <p>
                  <b>Hook:</b> {v.hook}
                </p>
                <p className="text-muted-foreground">
                  <b className="text-foreground">Audiens:</b> {v.audience}
                </p>
                <p className="text-muted-foreground">
                  <b className="text-foreground">{platform === "google" ? "Sitelink & callout:" : "Arahan visual:"}</b> {v.visual}
                </p>
                <p className="text-muted-foreground">
                  <b className="text-foreground">Hipotesis:</b> {v.reason}
                </p>
                {!!v.flags?.length && (
                  <ul className="mt-1 space-y-0.5 rounded-lg bg-amber-500/10 p-2 text-amber-800 dark:text-amber-200">
                    {v.flags.map((f) => (
                      <li key={f}>⚠ {f}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Rencana tes A/B">
        <div className="space-y-4 text-sm">
          <KeyValues
            items={[
              { k: "Struktur kampanye", v: data.test_plan.structure },
              { k: "Durasi & syarat data", v: data.test_plan.duration },
              { k: "Metrik penentu", v: <b>{data.test_plan.primary_metric}</b> },
            ]}
          />
          {!!data.test_plan.budget_split.length && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Pembagian budget tes</p>
              <div className="flex h-3 overflow-hidden rounded-full">
                {data.test_plan.budget_split.map((b, i) => (
                  <div key={b.item} style={{ width: `${b.share_pct}%`, background: COLORS[i % COLORS.length] }} title={`${b.item} ${b.share_pct}%`} />
                ))}
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {data.test_plan.budget_split.map((b, i) => (
                  <div key={b.item} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span>
                      <b>
                        {b.item} · {b.share_pct}%
                      </b>{" "}
                      <span className="text-muted-foreground">{b.note}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DataTable
            headers={["Aksi", "Jika", "Maka"]}
            rows={data.test_plan.rules.map((r) => [<Pill key="t" tone={RULE[r.type].tone}>{RULE[r.type].label}</Pill>, r.condition, <span key="a" className="text-muted-foreground">{r.action}</span>])}
          />
        </div>
      </SectionCard>

      {!!data.compliance.length && (
        <SectionCard title="Catatan kepatuhan kebijakan iklan">
          <div className="grid gap-2 sm:grid-cols-2">
            {data.compliance.map((c) => (
              <div key={c.risk} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <b>{c.risk}</b>
                <p className="mt-1 text-xs text-muted-foreground">{c.guideline}</p>
                <p className="mt-1.5 text-xs">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Perbaikan:</span> {c.fix}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-pink-500 text-xs font-bold text-white", className)}>{name.slice(0, 1).toUpperCase()}</span>;
}

function MetaMock({ v, name }: { v: AdVariant; name: string }) {
  const [more, setMore] = useState(false);
  const long = chars(v.primary_text) > 125;
  return (
    <div className="overflow-hidden rounded-xl border bg-white text-gray-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100">
      <div className="flex items-center gap-2 p-3">
        <Avatar name={name} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400">Bersponsor</p>
        </div>
      </div>
      <p className="whitespace-pre-line px-3 pb-2 text-[13px]">
        {long && !more ? `${[...v.primary_text].slice(0, 125).join("")}… ` : v.primary_text}
        {long && (
          <button type="button" className="font-medium text-gray-500 dark:text-zinc-400" onClick={() => setMore(!more)}>
            {more ? " Sembunyikan" : "Lihat selengkapnya"}
          </button>
        )}
      </p>
      <Visual v={v} className={v.format === "video" ? "aspect-[4/5]" : "aspect-square"} />
      <div className="flex items-center justify-between gap-3 bg-gray-100 px-3 py-2.5 dark:bg-zinc-800">
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase text-gray-500 dark:text-zinc-400">{v.description}</p>
          <p className="text-sm font-semibold leading-tight">{v.headline}</p>
        </div>
        <span className="shrink-0 rounded-md bg-gray-300 px-3 py-1.5 text-xs font-semibold dark:bg-zinc-700">{v.cta_button}</span>
      </div>
    </div>
  );
}

function TiktokMock({ v, name }: { v: AdVariant; name: string }) {
  return (
    <div className="relative mx-auto flex aspect-[9/14] w-full max-w-[300px] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-700 via-zinc-900 to-black p-3 text-white shadow-sm">
      <p className="absolute inset-x-3 top-1/3 -translate-y-1/2 text-center text-xs text-white/70">🎬 {v.visual}</p>
      <div className="absolute right-2 top-1/2 flex flex-col items-center gap-3 text-lg opacity-80">
        <span>♥</span>
        <span>💬</span>
        <span>↗</span>
      </div>
      <div className="relative space-y-1.5 pr-8">
        <p className="text-sm font-semibold">@{name.toLowerCase().replace(/\s+/g, "")}</p>
        <p className="text-[13px] leading-snug">{v.primary_text}</p>
        <p className="text-[11px] text-white/70">Bersponsor · {v.headline}</p>
        <span className="block rounded-md bg-[#fe2c55] py-1.5 text-center text-xs font-semibold">{v.cta_button}</span>
      </div>
    </div>
  );
}

function GoogleMock({ v, name }: { v: AdVariant; name: string }) {
  const hs = [v.headline, ...v.extra_headlines];
  const ds = [v.description, ...v.extra_descriptions];
  return (
    <div className="rounded-xl border bg-white p-3 text-gray-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100">
      <p className="text-xs font-bold">Bersponsor</p>
      <div className="mt-1 flex items-center gap-2">
        <Avatar name={name} className="size-6 text-[10px]" />
        <div className="leading-tight">
          <p className="text-xs">{name}</p>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400">{name.toLowerCase().replace(/\s+/g, "")}.id</p>
        </div>
      </div>
      <p className="mt-1.5 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{hs.slice(0, 3).join(" | ")}</p>
      <p className="mt-0.5 text-[13px] text-gray-700 dark:text-zinc-300">{ds.slice(0, 2).join(" ")}</p>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-primary">Semua aset & jumlah karakter</summary>
        <ul className="mt-1 space-y-0.5">
          {hs.map((h, i) => (
            <li key={`h${i}`} className="flex justify-between gap-2">
              <span>H{i + 1}: {h}</span>
              <span className={cn("shrink-0 tabular-nums", chars(h) > 30 ? "text-red-600" : "text-muted-foreground")}>{chars(h)}/30</span>
            </li>
          ))}
          {ds.map((d, i) => (
            <li key={`d${i}`} className="flex justify-between gap-2">
              <span>D{i + 1}: {d}</span>
              <span className={cn("shrink-0 tabular-nums", chars(d) > 90 ? "text-red-600" : "text-muted-foreground")}>{chars(d)}/90</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-muted-foreground">Kata kunci: {v.primary_text}</p>
      </details>
    </div>
  );
}

function ShopeeMock({ v, name }: { v: AdVariant; name: string }) {
  return (
    <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-xl border bg-white text-gray-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100">
      <Visual v={v} className="aspect-square" />
      <div className="space-y-1 p-2.5">
        <p className="line-clamp-2 text-[13px] leading-snug">
          <span className="mr-1 rounded bg-[#ee4d2d] px-1 text-[10px] font-semibold text-white">Iklan</span>
          {v.headline}
        </p>
        <p className="line-clamp-2 text-[11px] text-[#ee4d2d]">{v.primary_text}</p>
        <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500 dark:text-zinc-400">
          <span className="truncate">{name}</span>
          <span className="shrink-0 rounded bg-[#ee4d2d] px-2 py-0.5 font-semibold text-white">{v.cta_button}</span>
        </div>
      </div>
    </div>
  );
}

function Visual({ v, className }: { v: AdVariant; className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center bg-gradient-to-br from-primary/25 via-pink-500/15 to-amber-500/25 p-4", className)}>
      <span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">{v.format === "video" ? "▶ Video" : FORMAT_LABEL[v.format]}</span>
      <p className="line-clamp-6 text-center text-xs text-foreground/70">{v.visual}</p>
    </div>
  );
}
