"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clapperboard, Images, Lightbulb, Loader2, PenLine, RefreshCw, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AutopilotText } from "@/lib/i18n/autopilot";

export interface IdeaItem {
  id: string;
  batch_id: string;
  post_date: string;
  post_time: string;
  kind: "carousel" | "image" | "reel";
  pillar: string | null;
  funnel: string | null;
  title: string;
  angle: string | null;
  hook: string | null;
  reason: string | null;
}

/** Tahap ide (strategist): pelanggan meninjau, mengganti, atau menghapus ide sebelum copywriter menulis. */
export function IdeasSection({ t, ideas, dateLabel }: { t: AutopilotText; ideas: IdeaItem[]; dateLabel: (d: string) => string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (!ideas.length) return null;

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }
  async function writeAll() {
    setBusy("write");
    const r = await post("/api/autopilot/ideas/write", {});
    setBusy(null);
    if (!r.ok) return void toast.error((t.errors as Record<string, string>)[String(r.data.error)] ?? t.errors.generic);
    toast.success(t.ideas.written(r.data.created));
    router.refresh();
  }
  async function act(id: string, action: "replace" | "drop") {
    setBusy(`${action}-${id}`);
    const r = await post(`/api/autopilot/ideas/${id}`, { action, note: notes[id]?.trim() || undefined });
    setBusy(null);
    if (!r.ok) return void toast.error(t.errors.generic);
    setNotes((n) => ({ ...n, [id]: "" }));
    router.refresh();
  }
  const Icon = (k: IdeaItem["kind"]) => (k === "reel" ? Clapperboard : k === "carousel" ? Images : Square);

  return (
    <section className="mt-4 rounded-2xl border border-primary/30 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Lightbulb className="size-4 text-primary" /> {t.ideas.title}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{ideas.length}</span>
          </h2>
          <p className="text-sm text-muted-foreground">{t.ideas.sub}</p>
        </div>
        <Button onClick={writeAll} disabled={!!busy} className="rounded-full">
          {busy === "write" ? <Loader2 className="animate-spin" /> : <PenLine />} {busy === "write" ? t.ideas.writing : t.ideas.writeAll}
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {ideas.map((i) => {
          const K = Icon(i.kind);
          return (
            <div key={i.id} className="rounded-xl border p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-foreground px-1.5 py-0.5 font-semibold tabular-nums text-background">{i.post_time.slice(0, 5)}</span>
                <span className="text-muted-foreground">{dateLabel(i.post_date)}</span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <K className="size-3.5 text-primary" /> {t.kind[i.kind]}
                </span>
                {i.pillar && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{i.pillar}</span>}
                {i.funnel && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{i.funnel}</span>}
              </div>
              <p className="text-sm font-semibold leading-snug">{i.title}</p>
              <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                {i.angle && (
                  <div>
                    <dt className="inline font-medium text-foreground">{t.ideas.angle}: </dt>
                    <dd className="inline">{i.angle}</dd>
                  </div>
                )}
                {i.hook && (
                  <div>
                    <dt className="inline font-medium text-foreground">{t.ideas.hook}: </dt>
                    <dd className="inline">{i.hook}</dd>
                  </div>
                )}
                {i.reason && (
                  <div>
                    <dt className="inline font-medium text-foreground">{t.ideas.why}: </dt>
                    <dd className="inline">{i.reason}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-3 flex gap-2">
                <input
                  value={notes[i.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [i.id]: e.target.value.slice(0, 300) }))}
                  placeholder={t.ideas.notePh}
                  className="h-8 min-w-0 flex-1 rounded-lg border bg-background px-2.5 text-xs"
                />
                <Button size="sm" variant="outline" onClick={() => act(i.id, "replace")} disabled={!!busy}>
                  {busy === `replace-${i.id}` ? <Loader2 className="animate-spin" /> : <RefreshCw />} {busy === `replace-${i.id}` ? t.ideas.replacing : t.ideas.replace}
                </Button>
                <Button size="icon" variant="ghost" className="size-8 text-muted-foreground" onClick={() => act(i.id, "drop")} disabled={!!busy} aria-label={t.ideas.drop}>
                  {busy === `drop-${i.id}` ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
