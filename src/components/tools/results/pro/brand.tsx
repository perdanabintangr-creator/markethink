"use client";

import { cleanHex, inkOn, type BrandOutput } from "@/lib/addons/pro/specs/brand";
import { cn } from "@/lib/utils";
import { CopyButton, CopyCard, DoDont, KeyValues, Pill, Points, SectionCard } from "./kit";

const fontUrl = (families: string[]) =>
  `https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700`).join("&")}&display=swap`;

export function BrandResult({ data }: { data: BrandOutput }) {
  const v = data.visual;
  const palette = v.palette.filter((p) => cleanHex(p.hex));
  const primary = palette.find((p) => /primer|primary|utama/i.test(p.role)) ?? palette[0];
  const heroBg = primary ? cleanHex(primary.hex)! : undefined;
  const heading = v.heading_font.family;
  const body = v.body_font.family;

  return (
    <div className="space-y-4">
      {/* Font Google untuk pratinjau tipografi */}
      <link rel="stylesheet" href={fontUrl([...new Set([heading, body])])} precedence="default" />

      <section
        className={cn("rounded-2xl border p-5 sm:p-6", !heroBg && "border-primary/30 bg-primary/5")}
        style={heroBg ? { background: heroBg, color: inkOn(heroBg) } : undefined}
      >
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Brand essence</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl" style={{ fontFamily: `'${heading}', serif` }}>
          {data.essence}
        </h2>
        <p className="mt-2 max-w-2xl text-sm opacity-90">{data.essence_story}</p>
        <p className="mt-3 inline-flex rounded-full bg-black/10 px-3 py-1 text-xs font-medium dark:bg-white/10">Archetype: {data.archetype}</p>
      </section>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { k: "Purpose", v: <p>{data.purpose}</p> },
          { k: "Visi", v: <p>{data.vision}</p> },
          { k: "Misi", v: <Points items={data.mission} /> },
        ].map((x) => (
          <div key={x.k} className="rounded-xl border bg-card p-3 text-sm print:break-inside-avoid">
            <p className="mb-1 text-xs font-semibold uppercase text-primary">{x.k}</p>
            {x.v}
          </div>
        ))}
      </div>

      <SectionCard title="Positioning & brand promise">
        <div className="rounded-xl border-l-4 border-primary bg-muted/50 p-3 text-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-primary">Positioning statement</p>
            <CopyButton text={data.positioning.statement} />
          </div>
          <p className="italic">{data.positioning.statement}</p>
        </div>
        <div className="mt-3">
          <KeyValues
            items={[
              { k: "Untuk", v: data.positioning.target },
              { k: "Yang", v: data.positioning.need },
              { k: "Kategori", v: data.positioning.frame },
              { k: "Pembeda", v: data.positioning.difference },
              { k: "Alasan percaya", v: data.positioning.reason },
            ]}
          />
        </div>
        <div className="mt-3 rounded-xl bg-primary/10 p-3 text-sm">
          <p className="text-xs font-semibold uppercase text-primary">Brand promise</p>
          <p className="mt-0.5 font-medium">{data.promise}</p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          <b>Archetype {data.archetype}:</b> {data.archetype_note}
        </p>
      </SectionCard>

      <SectionCard title="Nilai brand">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.values.map((x, i) => (
            <div key={i} className="rounded-xl border bg-background p-3 text-sm print:break-inside-avoid">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                <b>{x.name}</b>
              </div>
              <p className="mt-1.5 text-muted-foreground">{x.meaning}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase text-muted-foreground">Dalam praktik</p>
              <Points items={x.behaviors} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Kepribadian">
        <div className="space-y-2">
          {data.personality.map((p, i) => (
            <div key={i} className="grid gap-2 rounded-xl border bg-background p-3 text-sm sm:grid-cols-[120px_1fr_1fr] print:break-inside-avoid">
              <b>{p.trait}</b>
              <p>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">ADALAH · </span>
                {p.is}
              </p>
              <p className="text-muted-foreground">
                <span className="text-xs font-semibold text-red-700 dark:text-red-300">BUKAN · </span>
                {p.is_not}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Tone of voice">
        <div className="space-y-4">
          {data.tone.map((x, i) => (
            <div key={i} className="text-sm print:break-inside-avoid">
              <div className="mb-1.5 flex justify-between text-xs font-medium">
                <span className={cn(x.value <= 2 && "text-primary")}>{x.left}</span>
                <span className={cn(x.value >= 4 && "text-primary")}>{x.right}</span>
              </div>
              <div className="relative h-2 rounded-full bg-muted">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/40" style={{ left: `${(n - 1) * 25}%` }} />
                ))}
                <span
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow"
                  style={{ left: `${(x.value - 1) * 25}%` }}
                  title={`${x.value}/5`}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{x.note}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Contoh suara per situasi">
        <div className="space-y-2">
          {data.voice_examples.map((x, i) => (
            <div key={i} className="rounded-xl border bg-background p-3 text-sm print:break-inside-avoid">
              <p className="mb-2 font-medium">{x.situation}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-emerald-500/10 p-2.5">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">✓ Katakan</span>
                    <CopyButton text={x.say} />
                  </div>
                  <p>{x.say}</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-2.5">
                  <p className="mb-1 text-xs font-semibold text-red-700 dark:text-red-300">✕ Jangan katakan</p>
                  <p className="text-muted-foreground line-through decoration-red-500/40">{x.avoid}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{x.why}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Messaging house">
        <div className="overflow-hidden rounded-xl border">
          <div className="bg-primary px-4 py-3 text-center text-primary-foreground">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Pesan utama</p>
            <p className="font-semibold">{data.messaging.core}</p>
          </div>
          <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {data.messaging.pillars.map((m, i) => (
              <div key={i} className="p-3 text-sm">
                <p className="font-medium">{m.message}</p>
                <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                  {m.proof.map((p, k) => (
                    <li key={k} className={cn(/perlu bukti/i.test(p) && "text-amber-700 dark:text-amber-300")}>
                      • {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Opsi tagline">
        <div className="space-y-2">
          {data.taglines.map((x, i) => (
            <CopyCard key={i} title={`"${x.line}"`} text={x.rationale} meta={i === 0 ? <Pill tone="good">Rekomendasi</Pill> : undefined} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Arahan visual" hint={v.direction}>
        <div className="flex h-4 overflow-hidden rounded-full border">
          {palette.map((p, i) => (
            <div key={i} style={{ width: `${p.share}%`, background: p.hex }} title={`${p.name} ${p.share}%`} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {palette.map((p, i) => (
            <div key={i} className="overflow-hidden rounded-xl border bg-background text-sm print:break-inside-avoid">
              <div className="flex h-20 items-end justify-between p-2" style={{ background: p.hex, color: inkOn(p.hex) }}>
                <span className="font-mono text-xs font-semibold">{p.hex}</span>
                <span className="text-[11px] opacity-80">{p.share}%</span>
              </div>
              <div className="p-2">
                <div className="flex items-start justify-between gap-1">
                  <b className="leading-tight">{p.name}</b>
                  <CopyButton text={p.hex} label="Hex" className="h-6 px-1.5" />
                </div>
                <Pill tone="primary">{p.role}</Pill>
                <p className="mt-1 text-xs text-muted-foreground">{p.usage}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            { label: "Font judul", f: v.heading_font, sample: data.essence, big: true },
            { label: "Font isi", f: v.body_font, sample: data.promise, big: false },
          ].map((x) => (
            <div key={x.label} className="rounded-xl border bg-background p-3 text-sm print:break-inside-avoid">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{x.label}</span>
                <a
                  href={`https://fonts.google.com/specimen/${encodeURIComponent(x.f.family).replace(/%20/g, "+")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline print:hidden"
                >
                  Google Fonts ↗
                </a>
              </div>
              <p className={cn("mt-1", x.big ? "text-2xl font-bold" : "text-base")} style={{ fontFamily: `'${x.f.family}', ${x.big ? "serif" : "sans-serif"}` }}>
                {x.sample}
              </p>
              <p className="mt-1 font-medium">{x.f.family}</p>
              <p className="text-xs text-muted-foreground">{x.f.why}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border bg-background p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Gaya foto</p>
            <p className="mt-1">{v.photography}</p>
          </div>
          {v.illustration && (
            <div className="rounded-xl border bg-background p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Ilustrasi & ikon</p>
              <p className="mt-1">{v.illustration}</p>
            </div>
          )}
        </div>

        <p className="mb-2 mt-4 text-sm font-medium">Aturan logo</p>
        <DoDont dos={v.logo_do} donts={v.logo_dont} doLabel="Lakukan" dontLabel="Jangan" />
      </SectionCard>

      <SectionCard title="Word bank">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Kata yang kami pakai</p>
            <div className="flex flex-wrap gap-1.5">{data.word_bank.use.map((w, i) => <Pill key={i} tone="good">{w}</Pill>)}</div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-red-700 dark:text-red-300">Kata yang dihindari</p>
            <div className="flex flex-wrap gap-1.5">{data.word_bank.avoid.map((w, i) => <Pill key={i} tone="bad">{w}</Pill>)}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Do & don't">
        <DoDont dos={data.dos} donts={data.donts} doLabel="Selalu" dontLabel="Jangan pernah" />
      </SectionCard>
    </div>
  );
}
