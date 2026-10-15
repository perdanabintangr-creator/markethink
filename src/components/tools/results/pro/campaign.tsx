"use client";

import { PHASE_LABEL, type CampaignOutput } from "@/lib/addons/pro/specs/campaign";
import { idr } from "@/lib/addons/pro/specs/plan";
import { cn } from "@/lib/utils";
import { BudgetSplit } from "./plan";
import { CopyButton, CopyCard, DataTable, DoDont, KeyValues, Pill, Points, SectionCard, StatGrid } from "./kit";

const PHASE_STYLE = {
  teaser: "border-sky-500/40 bg-sky-500/5",
  launch: "border-primary/50 bg-primary/5",
  sustain: "border-emerald-500/40 bg-emerald-500/5",
} as const;
const LEVEL_LABEL = { bisnis: "Bisnis", kampanye: "Kampanye", konten: "Konten" } as const;

/** Brief lengkap dalam teks biasa — untuk ditempel ke email/WhatsApp/dokumen agency. */
function briefText(d: CampaignOutput) {
  const L = (title: string, body: string) => `${title.toUpperCase()}\n${body}\n`;
  const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  return [
    `CAMPAIGN BRIEF — ${d.name}\n`,
    L("Latar belakang", d.background),
    L("Masalah bisnis", d.problem),
    L("Objective", `${d.objective}\n${list(d.kpis.map((k) => `${k.metric}: ${k.target} (${k.note})`))}`),
    L("Target audiens", `${d.audience.profile}\nSekarang: ${d.audience.current}\nSetelah kampanye: ${d.audience.desired}`),
    L("Consumer insight", d.audience.insight),
    L("Single-minded proposition", d.proposition),
    L(`Big idea — ${d.big_idea.title}`, d.big_idea.description),
    L("Key message", d.key_message),
    L("Opsi tagline", list(d.taglines.map((x) => x.line))),
    L("Reasons to believe", list(d.rtb)),
    L("Tone", `${d.tone.words.join(", ")} — ${d.tone.note}`),
    L("Channel plan", list(d.channels.map((c) => `${c.channel} (${c.timing}): ${c.execution}`))),
    L("Deliverables", list(d.deliverables.map((x) => `${x.qty}× ${x.item} — ${x.spec} · ${x.owner} · ${x.deadline}`))),
    L("Timeline", list(d.phases.map((p) => `${PHASE_LABEL[p.phase]} (${p.period}): ${p.goal}`))),
    L(`Budget ${d.budget.total !== null ? idr(d.budget.total) : ""}`, list(d.budget.items.map((b) => `${b.item}: ${b.pct}%${b.amount !== null ? ` (${idr(b.amount)})` : ""}`))),
    L("Wajib ada", list(d.mandatories.must)),
    L("Dilarang", list(d.mandatories.avoid)),
    L("Success metrics", list(d.success.map((s) => `[${LEVEL_LABEL[s.level]}] ${s.metric}: ${s.target} — ${s.how}`))),
  ].join("\n");
}

export function CampaignResult({ data }: { data: CampaignOutput }) {
  const totalQty = data.deliverables.reduce((s, d) => s + d.qty, 0);
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Campaign brief</p>
          <CopyButton text={briefText(data)} label="Salin brief lengkap" />
        </div>
        <h2 className="mt-1 text-2xl font-bold">{data.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{data.name_note}</p>
        <p className="mt-3 text-sm">
          <b>Objective:</b> {data.objective}
        </p>
      </section>

      <StatGrid
        items={[
          ...data.kpis.slice(0, 3).map((k) => ({ label: k.metric, value: k.target, note: k.note, tone: "primary" as const })),
          { label: "Budget", value: idr(data.budget.total), note: data.budget.basis === "rekomendasi" ? "Rekomendasi" : `${totalQty} materi produksi` },
        ]}
      />

      <SectionCard title="Latar belakang & masalah">
        <KeyValues
          items={[
            { k: "Situasi", v: data.background },
            { k: "Masalah bisnis", v: <b>{data.problem}</b> },
          ]}
        />
      </SectionCard>

      <SectionCard title="Target audiens & insight">
        <p className="text-sm">{data.audience.profile}</p>
        <div className="mt-3 grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-xl bg-muted/60 p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Sekarang mereka</p>
            <p className="mt-1">{data.audience.current}</p>
          </div>
          <div className="flex items-center justify-center text-xl text-primary">→</div>
          <div className="rounded-xl bg-primary/10 p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-primary">Setelah kampanye</p>
            <p className="mt-1">{data.audience.desired}</p>
          </div>
        </div>
        <blockquote className="mt-3 rounded-xl border-l-4 border-amber-500 bg-amber-500/10 p-4 text-base italic">
          <p className="mb-1 text-xs font-semibold uppercase not-italic text-amber-700 dark:text-amber-300">Consumer insight</p>
          {data.audience.insight}
        </blockquote>
      </SectionCard>

      <section className="rounded-2xl bg-foreground p-5 text-background print:break-inside-avoid">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Single-minded proposition</p>
          <CopyButton text={data.proposition} className="border-background/30 bg-transparent text-background hover:bg-background/10" />
        </div>
        <p className="mt-1 text-xl font-bold">{data.proposition}</p>
      </section>

      <SectionCard title={`Big idea: ${data.big_idea.title}`}>
        <p className="text-sm">{data.big_idea.description}</p>
        <p className="mt-2 rounded-lg bg-muted/60 p-3 text-sm">
          <span className="text-xs font-semibold uppercase text-primary">Kenapa ini jalan · </span>
          {data.big_idea.why}
        </p>
      </SectionCard>

      <SectionCard title="Pesan & tagline">
        <CopyCard title="Key message" text={data.key_message} />
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {data.taglines.map((x, i) => (
            <div key={i} className="rounded-xl border bg-background p-3 text-sm print:break-inside-avoid">
              <div className="flex items-start justify-between gap-2">
                <b>&ldquo;{x.line}&rdquo;</b>
                <CopyButton text={x.line} label="" className="px-1.5" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{x.note}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Reasons to believe</p>
            <Points items={data.rtb} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Tone</p>
            <div className="flex flex-wrap gap-1">{data.tone.words.map((w, i) => <Pill key={i} tone="primary">{w}</Pill>)}</div>
            <p className="mt-1.5 text-sm text-muted-foreground">{data.tone.note}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Timeline kampanye">
        <div className="grid gap-2 sm:grid-cols-3">
          {data.phases.map((p, i) => (
            <div key={i} className={cn("rounded-xl border p-3 text-sm print:break-inside-avoid", PHASE_STYLE[p.phase])}>
              <div className="flex items-center justify-between gap-2">
                <b>{PHASE_LABEL[p.phase]}</b>
                <Pill>{p.period}</Pill>
              </div>
              <p className="mt-1 text-muted-foreground">{p.goal}</p>
              <Points items={p.activities} className="mt-2" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Channel plan">
        <DataTable
          headers={["Kanal", "Peran", "Eksekusi", "Fase", "Waktu"]}
          minWidth={720}
          rows={data.channels.map((c) => [
            c.channel,
            <span key="r" className="text-muted-foreground">{c.role}</span>,
            c.execution,
            <Pill key="p" tone={c.phase === "launch" ? "primary" : "muted"}>{c.phase === "semua" ? "Semua" : PHASE_LABEL[c.phase]}</Pill>,
            <span key="t" className="whitespace-nowrap text-xs">{c.timing}</span>,
          ])}
        />
      </SectionCard>

      <SectionCard title="Deliverables" hint={`${totalQty} materi · ${data.deliverables.length} jenis`}>
        <DataTable
          headers={["Item", "Jml", "Spesifikasi", "Kanal", "PIC", "Deadline"]}
          minWidth={760}
          rows={data.deliverables.map((d) => [
            d.item,
            <b key="q" className="tabular-nums">{d.qty}</b>,
            <span key="s" className="text-xs text-muted-foreground">{d.spec}</span>,
            d.channel,
            d.owner,
            <span key="d" className="whitespace-nowrap text-xs">{d.deadline}</span>,
          ])}
        />
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Rincian budget" hint={data.budget.total !== null ? `${idr(data.budget.total)}${data.budget.basis === "rekomendasi" ? " · rekomendasi" : ""}` : undefined}>
          <BudgetSplit items={data.budget.items} />
        </SectionCard>
        <SectionCard title="Success metrics">
          <div className="space-y-2">
            {data.success.map((s, i) => (
              <div key={i} className="rounded-lg border bg-background px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span>
                    <Pill tone={s.level === "bisnis" ? "primary" : s.level === "kampanye" ? "warn" : "muted"}>{LEVEL_LABEL[s.level]}</Pill> <b>{s.metric}</b>
                  </span>
                  <b className="shrink-0 text-primary">{s.target}</b>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.how}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Mandatories">
        <DoDont dos={data.mandatories.must} donts={data.mandatories.avoid} doLabel="Wajib ada" dontLabel="Dilarang" />
      </SectionCard>
    </div>
  );
}
