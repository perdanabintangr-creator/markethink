"use client";

import { Fragment } from "react";
import { flowVariables, type FlowMessage, type FlowOutput } from "@/lib/addons/pro/specs/flow";
import { cn } from "@/lib/utils";
import { CardGrid, CopyButton, Pill, SectionCard, StatGrid, Summary, Timeline, useResultsI18n } from "./kit";

/** Teks pesan: *tebal*, _miring_, dan {variabel} disorot. */
function MsgText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_|\{[a-zA-Z0-9_ ]{2,30}\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("{") && p.endsWith("}") ? (
          <span key={i} className="rounded bg-sky-500/15 px-1 font-mono text-[0.85em] text-sky-700 dark:text-sky-300">
            {p}
          </span>
        ) : p.length > 2 && p.startsWith("*") && p.endsWith("*") ? (
          <b key={i}>{p.slice(1, -1)}</b>
        ) : p.length > 2 && p.startsWith("_") && p.endsWith("_") ? (
          <i key={i}>{p.slice(1, -1)}</i>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const isEmail = (m: FlowMessage) => /mail/i.test(m.channel);

function Message({ m }: { m: FlowMessage }) {
  const t = useResultsI18n().t.flow;
  const copy = isEmail(m) && m.subject ? `${t.subjectCopy(m.subject)}\n\n${m.text}` : m.text;
  return (
    <div className="min-w-0 flex-1">
      {isEmail(m) ? (
        <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2 text-xs">
            <span>✉️</span>
            <span className="text-muted-foreground">{t.subject}</span>
            <b className="min-w-0 truncate">
              <MsgText text={m.subject || t.noSubject} />
            </b>
          </div>
          <p className="whitespace-pre-line px-3 py-2.5 text-sm">
            <MsgText text={m.text} />
          </p>
          <div className="px-3 pb-3">
            <span className="inline-block rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">{m.cta}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#efeae2] p-2.5 dark:bg-[#0b141a] print:bg-white">
          <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm whitespace-pre-wrap text-zinc-900 shadow-sm dark:bg-[#005c4b] dark:text-zinc-50">
            <MsgText text={m.text} />
            <span className="mt-1 block text-right text-[10px] text-zinc-500 dark:text-zinc-300">✓✓</span>
          </div>
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        {!isEmail(m) && <Pill tone="good">CTA: {m.cta}</Pill>}
        {flowVariables(`${m.subject} ${m.text}`).map((v) => (
          <span key={v} className="font-mono text-[10px] text-muted-foreground">
            {v}
          </span>
        ))}
        <CopyButton text={copy} className="ml-auto" />
      </div>
      {m.note && <p className="mt-1 text-xs text-muted-foreground">💡 {m.note}</p>}
    </div>
  );
}

export function FlowResult({ data }: { data: FlowOutput }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.flow;
  const num = f.num;
  const all = data.stages.flatMap((s) => s.messages);
  const wa = all.filter((m) => !isEmail(m)).length;
  const vars = [...new Set(all.flatMap((m) => flowVariables(`${m.subject} ${m.text}`)))];

  return (
    <div className="space-y-4">
      <Summary text={data.summary} />

      <StatGrid
        items={[
          { label: t.stages, value: String(data.stages.length), tone: "primary" },
          { label: t.totalMessages, value: String(all.length) },
          { label: t.channels, value: t.channelSplit(wa, all.length - wa), note: t.channelNote },
          { label: t.variables, value: String(vars.length), note: vars.slice(0, 4).join(" ") },
        ]}
      />

      <SectionCard title={t.map}>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
          {data.stages.map((s, i) => (
            <div key={i} className="flex items-center gap-2 sm:flex-1">
              <a href={`#tahap-${i + 1}`} className="flex-1 rounded-xl border bg-background p-3 text-sm transition-colors hover:border-primary/50">
                <p className="text-[11px] font-semibold uppercase text-primary">{t.stageN(i + 1)}</p>
                <p className="font-medium">{s.stage}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.nMessages(s.messages.length)}
                  {s.conversion_rate !== null && <> · {t.conversion(num(s.conversion_rate, 1))}</>}
                </p>
              </a>
              {i < data.stages.length - 1 && <span className="hidden text-muted-foreground sm:inline">→</span>}
            </div>
          ))}
        </div>
      </SectionCard>

      {data.stages.map((s, i) => (
        <details key={i} id={`tahap-${i + 1}`} open className="group rounded-2xl border bg-card p-4 sm:p-5 print:break-inside-avoid">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
            <h2 className="font-semibold">{s.stage}</h2>
            <span className="ml-auto flex flex-wrap gap-1">
              {s.reply_rate !== null && <Pill tone="primary">{t.reply(num(s.reply_rate, 1))}</Pill>}
              {s.conversion_rate !== null && <Pill tone="good">{t.conversion(num(s.conversion_rate, 1))}</Pill>}
              <span className="text-xs text-muted-foreground group-open:hidden">{t.seeMessages}</span>
            </span>
          </summary>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-sky-500/10 p-2.5">
              <p className="text-[11px] font-semibold uppercase text-sky-700 dark:text-sky-300">{t.trigger}</p>
              <p>{s.trigger}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5">
              <p className="text-[11px] font-semibold uppercase text-primary">{t.goal}</p>
              <p>{s.goal}</p>
            </div>
            <div className="rounded-lg bg-muted p-2.5">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">{t.exit}</p>
              <p>{s.exit}</p>
            </div>
          </div>

          <ol className="relative mt-4 space-y-4 border-l-2 border-dashed border-primary/30 pl-5 sm:ml-28 sm:pl-6">
            {s.messages.map((m, k) => (
              <li key={k} className="relative print:break-inside-avoid">
                <span
                  className={cn(
                    "absolute -left-[30px] top-1 flex size-4 items-center justify-center rounded-full ring-4 ring-card sm:-left-[34px]",
                    isEmail(m) ? "bg-violet-500" : "bg-emerald-500",
                  )}
                />
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:absolute sm:-left-[124px] sm:top-0 sm:mb-0 sm:w-20 sm:flex-col sm:items-end sm:text-right">
                  <span className="text-xs font-semibold tabular-nums">{m.delay}</span>
                  <span className="text-[10px] text-muted-foreground">{m.channel}</span>
                </div>
                <Message m={m} />
              </li>
            ))}
          </ol>

          {s.metric_note && <p className="mt-3 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">{t.measure(s.metric_note)}</p>}
        </details>
      ))}

      <SectionCard title={t.segments} hint={t.segmentsHint}>
        <CardGrid
          cols={3}
          items={data.segments.map((s) => ({
            title: s.name,
            body: (
              <>
                <span className="block">{s.rule}</span>
                <span className="mt-1 block text-foreground">→ {s.treatment}</span>
              </>
            ),
          }))}
        />
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title={t.setup}>
          <Timeline items={data.setup.map((s) => ({ title: s.title, body: s.detail }))} />
        </SectionCard>
        <SectionCard title={t.rules}>
          <div className="space-y-2">
            {data.compliance.map((c, i) => (
              <div key={i} className="rounded-xl bg-amber-500/10 p-3 text-sm">
                <b>{c.rule}</b>
                <p className="mt-0.5 text-muted-foreground">{c.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t.targets}>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.kpis.map((k) => (
            <div key={k.metric} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
              <span>{k.metric}</span>
              <b className="text-right">{k.target}</b>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
