"use client";

import { useState } from "react";
import { pressParagraphs, pressText, wordCount, type PressOutput } from "@/lib/addons/pro/specs/press";
import { cn } from "@/lib/utils";
import { Checklist, CopyButton, CopyCard, KeyValues, Pill, Points, SectionCard, toneOf, useResultsI18n } from "./kit";

/** Tandai placeholder [..] agar mudah terlihat sebelum rilis dikirim. */
function Marked({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\[[^\]]+\]$/.test(p) ? (
          <mark key={i} className="rounded bg-amber-200/80 px-0.5 text-amber-950">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function PressResult({ data }: { data: PressOutput }) {
  const { t: tr } = useResultsI18n();
  const t = tr.press;
  const [pick, setPick] = useState(0);
  const h = data.headlines[pick] ?? data.headlines[0];
  const full = pressText(data, pick);
  const words = wordCount(data.pitch.body);

  return (
    <div className="space-y-4">
      {data.to_verify.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm print:hidden">
          <p className="mb-1 font-semibold text-amber-800 dark:text-amber-200">{t.verify}</p>
          <Points items={data.to_verify} />
        </div>
      )}

      <SectionCard title={t.pickTitle} hint={t.pickHint}>
        <div className="grid gap-2 md:grid-cols-3">
          {data.headlines.map((x, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPick(i)}
              className={cn(
                "rounded-xl border bg-background p-3 text-left text-sm transition-colors hover:border-primary/50",
                pick === i && "border-primary ring-1 ring-primary",
              )}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-1">
                <Pill tone={pick === i ? "primary" : "muted"}>{tr.common.option(i + 1)}</Pill>
                <Pill tone={x.title.length <= 90 ? "good" : "warn"}>{tr.common.chars(x.title.length)}</Pill>
              </div>
              <p className="font-semibold leading-snug">{x.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{x.subtitle}</p>
              <p className="mt-2 text-[11px] uppercase tracking-wide text-primary">{x.angle}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <section className="rounded-2xl border bg-card p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t.release}</h2>
          <CopyButton text={full} label={t.copyFull} />
        </div>
        <article className="mx-auto max-w-3xl rounded-lg bg-white px-5 py-7 font-serif text-[15px] leading-relaxed text-zinc-900 shadow-sm ring-1 ring-black/5 sm:px-12 sm:py-10 print:shadow-none print:ring-0">
          <div className="mb-6 flex items-center justify-between border-b border-zinc-300 pb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            <span>{t.pressRelease}</span>
            <span>{t.immediate}</span>
          </div>
          <h1 className="text-center text-xl font-bold leading-snug sm:text-2xl">{h?.title}</h1>
          {h?.subtitle && <p className="mt-2 text-center italic text-zinc-600">{h.subtitle}</p>}
          <div className="mt-6 space-y-4">
            {pressParagraphs(data).map((p, i) =>
              p.kind === "lead" ? (
                <p key={i}>
                  <b>{data.dateline.replace(/\s*[–—-]\s*$/, "")}</b>: <Marked text={data.lead} />
                </p>
              ) : (
                <p key={i} className={cn(p.kind === "quote" && "border-l-2 border-zinc-300 pl-3")}>
                  <Marked text={p.text} />
                </p>
              ),
            )}
          </div>
          <p className="my-6 text-center tracking-widest">###</p>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-bold">{data.boilerplate_title}</p>
              <p className="text-zinc-700">
                <Marked text={data.boilerplate} />
              </p>
            </div>
            <div>
              <p className="font-bold">{t.mediaContact}</p>
              <p className="whitespace-pre-line text-zinc-700">
                <Marked text={data.media_contact} />
              </p>
            </div>
            {data.notes_to_editor && (
              <div>
                <p className="font-bold">{t.notesEditor}</p>
                <p className="text-zinc-700">
                  <Marked text={data.notes_to_editor} />
                </p>
              </div>
            )}
          </div>
        </article>
      </section>

      <SectionCard title={t.pitch} hint={<Pill tone={words <= 150 ? "good" : "warn"}>{t.words(words)}</Pill>}>
        <div className="rounded-xl border bg-background text-sm">
          <div className="flex items-start justify-between gap-2 border-b p-3">
            <p className="min-w-0">
              <span className="text-xs text-muted-foreground">{t.subject}</span>
              <b>{data.pitch.subject}</b>
            </p>
            <CopyButton text={data.pitch.subject} label={t.copySubject} />
          </div>
          <div className="p-3">
            <div className="mb-2 flex justify-end">
              <CopyButton text={`${data.pitch.body}\n\n---\n\n${full}`} label={t.copyEmail} />
            </div>
            <p className="whitespace-pre-line">
              <Marked text={data.pitch.body} />
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t.pitchNote}</p>
      </SectionCard>

      <SectionCard title={t.targets} hint={t.targetsHint}>
        <div className="grid gap-2 md:grid-cols-2">
          {data.media_targets.map((m, i) => (
            <div key={i} className="rounded-xl border bg-background p-3 text-sm print:break-inside-avoid">
              <div className="flex items-start justify-between gap-2">
                <b>{m.desk}</b>
                <Pill tone={toneOf(m.priority)}>{t.priority(tr.ev(m.priority))}</Pill>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {m.outlets.map((o) => (
                  <Pill key={o}>{o}</Pill>
                ))}
              </div>
              <p className="mt-2 text-muted-foreground">
                <span className="text-xs font-semibold uppercase text-primary">{t.angle}</span>
                {m.angle}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.social}>
        <div className="grid gap-2 md:grid-cols-2">
          {data.social.map((s, i) => (
            <CopyCard key={i} title={s.platform} text={s.text} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.qa} hint={t.nQuestions(data.qa.length)}>
        <div className="divide-y rounded-xl border">
          {data.qa.map((q, i) => (
            <details key={i} className="group p-3 text-sm print:break-inside-avoid" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-start gap-2 font-medium">
                <span className="text-primary">{t.q(i + 1)}</span>
                <span className="flex-1">{q.question}</span>
                <span className="shrink-0 text-xs text-muted-foreground group-open:hidden">{t.seeAnswer}</span>
              </summary>
              <p className="mt-2 pl-7 text-muted-foreground">{q.answer}</p>
            </details>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.distribution}>
        <KeyValues
          items={[
            { k: t.bestTime, v: data.distribution.best_time },
            { k: t.embargo, v: data.distribution.embargo },
            { k: t.attachments, v: <Points items={data.distribution.assets} /> },
          ]}
        />
        <div className="mt-4 rounded-xl border bg-background p-3">
          <Checklist items={data.distribution.checklist.map((c) => ({ task: c.task, when: c.when }))} />
        </div>
      </SectionCard>
    </div>
  );
}
