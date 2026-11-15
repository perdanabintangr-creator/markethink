"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { OUTCOME_RESULTS, outcomeTopic, type OutcomeResult } from "@/lib/ai/outcomes";
import { chatText } from "@/lib/i18n/chat";
import type { Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-context";

export interface SavedOutcome {
  result: OutcomeResult;
  note: string | null;
}

const TONE: Record<OutcomeResult, string> = {
  berhasil: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  biasa: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  gagal: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
};

/** Ingatan Hasil: laporkan hasil strategi dari jawaban ini (berhasil / biasa / tidak berhasil). */
export function OutcomeReport({
  chatId,
  messageId,
  question,
  answer,
  lang,
  saved,
  onChange,
}: {
  chatId: string;
  messageId: string;
  question: string;
  answer: string;
  lang: Lang;
  saved: SavedOutcome | null;
  onChange: (o: SavedOutcome | null) => void;
}) {
  const c = chatText(lang);
  const { t } = useApp();
  const [picked, setPicked] = useState<OutcomeResult | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function save() {
    if (!picked) return;
    setBusy(true);
    const res = await fetch("/api/outcome", {
      method: "POST",
      body: JSON.stringify({ chatId, messageId, result: picked, note: note.trim() || undefined, topic: outcomeTopic(question, answer) }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return toast.error(c.outcomeFailed);
    onChange({ result: picked, note: note.trim() || null });
    setEditing(false);
    setPicked(null);
  }

  async function remove() {
    setBusy(true);
    const res = await fetch("/api/outcome", { method: "DELETE", body: JSON.stringify({ chatId, messageId }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return toast.error(c.outcomeFailed);
    onChange(null);
  }

  if (saved && !editing) {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2 text-xs", TONE[saved.result])}>
        <Target className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1">
          {c.outcomeSaved(c.outcomeResults[saved.result])}
          {saved.note && <span className="block text-muted-foreground">“{saved.note}”</span>}
        </span>
        <button
          className="font-medium underline-offset-2 hover:underline"
          onClick={() => {
            setPicked(saved.result);
            setNote(saved.note ?? "");
            setEditing(true);
          }}
        >
          {c.outcomeChange}
        </button>
        <button className="font-medium underline-offset-2 hover:underline disabled:opacity-50" onClick={remove} disabled={busy}>
          {c.outcomeRemove}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed px-3 py-2.5 text-xs">
      <p className="flex items-center gap-1.5 text-muted-foreground">
        <Target className="size-3.5 shrink-0 text-primary" /> {c.outcomeAsk}
      </p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={c.outcomeAsk}>
        {OUTCOME_RESULTS.map((r) => (
          <button
            key={r}
            role="radio"
            aria-checked={picked === r}
            onClick={() => setPicked(r)}
            className={cn(
              "rounded-full border px-3 py-1 font-medium transition-colors",
              picked === r ? TONE[r] : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {c.outcomeResults[r]}
          </button>
        ))}
      </div>
      {picked && (
        <div className="space-y-2">
          <Textarea
            id={`outcome-note-${messageId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={c.outcomeNote}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            {editing && (
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditing(false)}>
                {t.cancel}
              </Button>
            )}
            <Button size="sm" className="h-8" onClick={save} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} {c.outcomeSave}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
