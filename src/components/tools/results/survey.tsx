"use client";

import { QUESTION_TYPE_LABEL, type SurveyOutput } from "@/lib/addons/schemas";
import { CopyButton, Pill, SectionCard } from "../common";
import { BarList } from "./research-common";

type Q = SurveyOutput["sections"][number]["questions"][number];

/** Pratinjau jawaban seperti tampilan formulir. */
function Answer({ q }: { q: Q }) {
  if (q.type === "nps" || q.type === "skala") {
    const from = q.type === "nps" ? 0 : 1;
    return (
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 11 - from }, (_, i) => i + from).map((v) => (
          <span key={v} className="flex size-7 items-center justify-center rounded-md border text-xs">
            {v}
          </span>
        ))}
      </div>
    );
  }
  if (q.type === "likert" && !q.options.length)
    return (
      <div className="flex flex-wrap gap-1 text-[11px]">
        {["Sangat tidak setuju", "Tidak setuju", "Netral", "Setuju", "Sangat setuju"].map((l) => (
          <span key={l} className="rounded-md border px-2 py-1">{l}</span>
        ))}
      </div>
    );
  if (q.type === "terbuka" || q.type === "angka" || !q.options.length)
    return <div className="h-8 rounded-md border border-dashed bg-muted/40" />;
  const mark = q.type === "multi" ? "rounded-sm" : q.type === "ranking" ? "rounded-sm text-[9px]" : "rounded-full";
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {q.options.map((o, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <span className={`flex size-3.5 shrink-0 items-center justify-center border ${mark}`}>{q.type === "ranking" ? i + 1 : ""}</span>
          {o}
        </li>
      ))}
    </ul>
  );
}

function asText(data: SurveyOutput) {
  const out: string[] = [data.title, "", data.intro, ""];
  data.screener.forEach((s, i) => out.push(`S${i + 1}. ${s.text}`, ...s.options.map((o) => `   - ${o}`), `   (${s.qualify})`, ""));
  for (const s of data.sections) {
    out.push(`== ${s.title} ==`);
    for (const q of s.questions) {
      out.push(`${q.code}. ${q.text} [${QUESTION_TYPE_LABEL[q.type]}]`, ...q.options.map((o) => `   - ${o}`));
      if (q.note) out.push(`   (${q.note})`);
    }
    out.push("");
  }
  return out.join("\n");
}

export function SurveyResult({ data }: { data: SurveyOutput }) {
  const total = data.sections.reduce((s, x) => s + x.questions.length, 0);
  return (
    <div className="space-y-4">
      {data.sample && (
        <section className="grid gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Responden minimal</p>
            <p className="text-2xl font-bold">{data.sample.n.toLocaleString("id-ID")}</p>
            <p className="text-xs text-muted-foreground">
              margin ±{data.sample.margin}% · keyakinan {data.sample.confidence}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Disarankan disebar ke</p>
            <p className="text-2xl font-bold text-primary">{data.sample.recommended.toLocaleString("id-ID")}</p>
            <p className="text-xs text-muted-foreground">+20% cadangan jawaban tidak valid</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kuesioner</p>
            <p className="text-2xl font-bold">{total} pertanyaan</p>
            <p className="text-xs text-muted-foreground">
              + {data.screener.length} screener · insentif: {data.incentive}
            </p>
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Tujuan riset">
          <ul className="space-y-1.5 text-sm">{data.objectives.map((o, i) => <li key={i}>🎯 {o}</li>)}</ul>
        </SectionCard>
        <SectionCard title="Hipotesis yang diuji">
          <ul className="space-y-1.5 text-sm">{data.hypotheses.map((o, i) => <li key={i}>H{i + 1}. {o}</li>)}</ul>
        </SectionCard>
      </div>

      <SectionCard title={data.title} hint={<CopyButton text={asText(data)} label="Salin kuesioner" />}>
        <p className="mb-4 rounded-xl bg-muted/60 p-3 text-sm">{data.intro}</p>
        {!!data.screener.length && (
          <div className="mb-4 space-y-3 rounded-xl border border-dashed border-primary/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Screener (saring responden)</p>
            {data.screener.map((s, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-sm font-medium">
                  S{i + 1}. {s.text}
                </p>
                <Answer q={{ code: "", text: s.text, type: "single", options: s.options, note: "" }} />
                <p className="text-xs text-muted-foreground">↳ {s.qualify}</p>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-5">
          {data.sections.map((s, i) => (
            <div key={i}>
              <div className="mb-2 border-b pb-1">
                <p className="font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.purpose}</p>
              </div>
              <div className="space-y-4">
                {s.questions.map((q) => (
                  <div key={q.code} className="space-y-1.5 print:break-inside-avoid">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        {q.code}. {q.text}
                      </p>
                      <Pill>{QUESTION_TYPE_LABEL[q.type]}</Pill>
                    </div>
                    <Answer q={q} />
                    {q.note && <p className="text-xs text-amber-700 dark:text-amber-300">↳ {q.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <SectionCard title="Kuota responden">
          <BarList
            items={data.quotas.map((k) => ({ label: k.group, value: k.share_pct, hint: data.sample ? `≈ ${Math.ceil((k.share_pct / 100) * data.sample.recommended)} orang` : undefined }))}
            max={100}
            unit="%"
          />
        </SectionCard>
        <SectionCard title="Rencana analisis">
          <div className="space-y-2">
            {data.analysis.map((a, i) => (
              <div key={i} className="rounded-xl border bg-background p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{a.objective}</b>
                  <Pill tone="primary">{a.questions}</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Metode: {a.method}</p>
                <p className="text-xs">→ {a.output}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Tips menyebar survei">
        <ul className="space-y-1.5 text-sm">{data.fieldwork.map((f, i) => <li key={i}>✅ {f}</li>)}</ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Excel berisi kolom “Pilihan jawaban” yang bisa langsung disalin ke Google Form. Setelah data terkumpul, upload hasilnya ke chat Markethink untuk dianalisis.
        </p>
      </SectionCard>
    </div>
  );
}
