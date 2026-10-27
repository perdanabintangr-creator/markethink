"use client";

import { useRef, useState } from "react";
import { FlaskConical, Loader2, MessagesSquare, Plus, RotateCcw, Send, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PersonaOutput } from "@/lib/addons/schemas";
import { personaLabText } from "@/lib/i18n/persona-lab";
import { CopyButton, Pill, SectionCard, useResultsI18n } from "../common";

const COLORS = ["#2563eb", "#ec4899", "#0ea5e9", "#f59e0b", "#14b8a6"];
type Msg = { role: "user" | "assistant"; content: string };

export interface LabTest {
  kind: string;
  variants: string[];
  at: string;
  winner: number;
  why: string;
  improvements: string[];
  improved_version: string;
  reactions: { persona: string; scores: number[]; favorite: number; would_buy: string; reaction: string; concern: string }[];
}

async function callLab(runId: string, body: unknown) {
  const res = await fetch(`/api/tools/runs/${runId}/persona-lab`, { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "");
  return data;
}

/** Uji ke Calon Pembeli: wawancarai persona atau minta semua persona menilai 2-3 versi materi marketing. */
export function PersonaLab({ runId, data }: { runId: string; data: PersonaOutput & { lab_tests?: LabTest[] } }) {
  const L = personaLabText(useResultsI18n().lang);
  const [tab, setTab] = useState<"interview" | "test">("interview");
  return (
    <SectionCard title={L.title} hint={L.hint} className="border-primary/40">
      <div className="mb-4 inline-flex rounded-full border bg-muted/50 p-1" role="tablist">
        {(["interview", "test"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors",
              tab === k ? "bg-background font-medium shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {k === "interview" ? <MessagesSquare className="size-4" /> : <FlaskConical className="size-4" />}
            {k === "interview" ? L.interview : L.test}
          </button>
        ))}
      </div>
      {tab === "interview" ? <Interview runId={runId} personas={data.personas} /> : <TestCopy runId={runId} history={data.lab_tests ?? []} />}
    </SectionCard>
  );
}

function Interview({ runId, personas }: { runId: string; personas: PersonaOutput["personas"] }) {
  const L = personaLabText(useResultsI18n().lang);
  const [who, setWho] = useState(0);
  const [chats, setChats] = useState<Record<number, Msg[]>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const msgs = chats[who] ?? [];
  const p = personas[who];

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setChats((c) => ({ ...c, [who]: next }));
    setText("");
    setBusy(true);
    try {
      const { reply } = await callLab(runId, { mode: "interview", persona: who, messages: next.slice(-30) });
      setChats((c) => ({ ...c, [who]: [...next, { role: "assistant", content: String(reply) }] }));
    } catch (err) {
      toast.error((err as Error).message || L.failed);
      setChats((c) => ({ ...c, [who]: msgs }));
      setText(q);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{L.pick}</p>
      <div className="flex flex-wrap gap-2">
        {personas.map((x, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setWho(i)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors",
              who === i ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent",
            )}
          >
            <span className="flex size-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: COLORS[i % COLORS.length] }}>
              {x.name.trim().charAt(0)}
            </span>
            {x.name.split(",")[0]}
          </button>
        ))}
      </div>

      <div className="max-h-96 min-h-40 space-y-2 overflow-y-auto rounded-xl border bg-background p-3">
        {msgs.length === 0 && <p className="text-sm italic text-muted-foreground">“{p?.quote}”</p>}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <p
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                m.role === "user" ? "rounded-br-md bg-primary/10" : "rounded-bl-md border bg-card",
              )}
            >
              {m.role === "assistant" && <b className="mb-0.5 block text-xs" style={{ color: COLORS[who % COLORS.length] }}>{p?.name.split(",")[0]}</b>}
              {m.content}
            </p>
          </div>
        ))}
        {busy && <p className="animate-pulse text-xs text-muted-foreground">{L.typing(p?.name.split(",")[0] ?? "")}</p>}
        <div ref={endRef} />
      </div>

      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {L.suggestions.map((s) => (
            <button key={s} type="button" onClick={() => void ask(s)} disabled={busy} className="rounded-full border px-3 py-1 text-xs hover:bg-accent">
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1500}
          placeholder={L.ask}
          className="h-10 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {msgs.length > 0 && (
          <Button type="button" variant="ghost" size="icon" title={L.reset} aria-label={L.reset} onClick={() => setChats((c) => ({ ...c, [who]: [] }))}>
            <RotateCcw />
          </Button>
        )}
        <Button type="submit" size="icon" className="rounded-full" disabled={busy || !text.trim()} aria-label={L.send}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
    </div>
  );
}

function TestCopy({ runId, history }: { runId: string; history: LabTest[] }) {
  const L = personaLabText(useResultsI18n().lang);
  const [kind, setKind] = useState("caption");
  const [context, setContext] = useState("");
  const [variants, setVariants] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const [tests, setTests] = useState<LabTest[]>(history);

  async function run() {
    const filled = variants.map((v) => v.trim()).filter((v) => v.length >= 3);
    if (filled.length < 2) return toast.error(L.minTwo);
    setBusy(true);
    try {
      const { test } = await callLab(runId, { mode: "test", kind, context, variants: filled });
      setTests((t) => [test as LabTest, ...t]);
    } catch (err) {
      toast.error((err as Error).message || L.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">{L.kind}</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
            {Object.entries(L.kinds).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">&nbsp;</span>
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={500}
            placeholder={L.context}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {variants.map((v, i) => (
          <div key={i} className="relative">
            <span className="mb-1 block text-xs font-medium">{L.version(i + 1)}</span>
            <textarea
              value={v}
              onChange={(e) => setVariants((vs) => vs.map((x, j) => (j === i ? e.target.value : x)))}
              maxLength={800}
              rows={5}
              placeholder={L.versionPh}
              className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {i === 2 && (
              <button type="button" onClick={() => setVariants((vs) => vs.slice(0, 2))} className="absolute right-1 top-0 p-1 text-muted-foreground" aria-label="x">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {variants.length < 3 && (
          <button type="button" onClick={() => setVariants((vs) => [...vs, ""])} className="flex min-h-28 items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-accent md:mt-5">
            <Plus className="size-4" /> {L.addVersion}
          </button>
        )}
      </div>
      <Button onClick={() => void run()} disabled={busy} className="rounded-full">
        {busy ? <Loader2 className="animate-spin" /> : <FlaskConical />} {busy ? L.running : L.run}
      </Button>

      {tests[0] && <TestResult test={tests[0]} />}
      {tests.length > 1 && (
        <details className="rounded-xl border p-3">
          <summary className="cursor-pointer text-sm font-medium">{L.history(tests.length - 1)}</summary>
          <div className="mt-3 space-y-4">
            {tests.slice(1).map((t, i) => (
              <TestResult key={i} test={t} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TestResult({ test }: { test: LabTest }) {
  const L = personaLabText(useResultsI18n().lang);
  const tone = (s: number) => (s >= 8 ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : s >= 5 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-red-500/15 text-red-700 dark:text-red-300");
  return (
    <div className="space-y-3 rounded-xl border bg-background p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Trophy className="size-5 text-amber-500" /> {L.winner(test.winner)}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Persona</th>
              {test.variants.map((_, i) => (
                <th key={i} className={cn("px-2 py-1.5 text-center font-medium", i + 1 === test.winner && "text-primary")}>
                  {L.version(i + 1)}
                </th>
              ))}
              <th className="py-1.5 pl-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {test.reactions.map((r) => (
              <tr key={r.persona} className="border-t align-top">
                <td className="py-2 pr-2">
                  <b>{r.persona.split(",")[0]}</b>
                  <p className="text-xs italic text-muted-foreground">“{r.reaction}”</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {L.concern} {r.concern}
                  </p>
                </td>
                {r.scores.map((s, i) => (
                  <td key={i} className="px-2 py-2 text-center">
                    <span className={cn("inline-block min-w-8 rounded-md px-1.5 py-0.5 font-semibold", tone(s), i + 1 === r.favorite && "ring-2 ring-primary")}>{s}</span>
                  </td>
                ))}
                <td className="py-2 pl-2">
                  <Pill tone={r.would_buy === "ya" ? "good" : r.would_buy === "mungkin" ? "warn" : "bad"}>{L.wouldBuy[r.would_buy] ?? r.would_buy}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm">
        <b>{L.why}:</b> {test.why}
      </p>
      <div>
        <p className="text-sm font-medium">{L.improve}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
          {test.improvements.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg bg-primary/10 p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{L.improved}</p>
          <CopyButton text={test.improved_version} />
        </div>
        <p className="whitespace-pre-wrap text-sm">{test.improved_version}</p>
      </div>
    </div>
  );
}
