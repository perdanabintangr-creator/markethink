"use client";

import { useState } from "react";
import { ChevronDown, Telescope } from "lucide-react";
import { Markdown } from "@/components/chat/markdown";
import { cn } from "@/lib/utils";
import { useResultsI18n } from "./common";

type Src = { title: string; url: string };

/** Nomor sumber [n] di catatan riset → tautan ke sumbernya. */
function linkSources(text: string, sources: Src[]) {
  return text.replace(/\[(\d{1,2})\](?!\()/g, (m, n) => {
    const s = sources[Number(n) - 1];
    return s ? `[[${n}]](${s.url})` : m;
  });
}

/** "Temuan riset lengkap": seluruh catatan riset web (fakta detail + nomor sumber) di bawah hasil Tools Pro. */
export function ResearchNotes({ output }: { output: unknown }) {
  const o = (output ?? {}) as { research_notes?: unknown; sources?: Src[] };
  const [open, setOpen] = useState(true);
  const { t } = useResultsI18n();
  if (typeof o.research_notes !== "string" || !o.research_notes.trim()) return null;
  const sources = Array.isArray(o.sources) ? o.sources : [];
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-6 print:break-before-page">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-left print:hidden" aria-expanded={open}>
        <Telescope className="size-5 text-primary" />
        <span className="flex-1">
          <span className="block text-lg font-semibold">{t.researchNotes.title}</span>
          <span className="block text-xs text-muted-foreground">{t.researchNotes.desc(sources.length)}</span>
        </span>
        <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <h2 className="hidden text-lg font-semibold print:block">{t.researchNotes.title}</h2>
      <div className={cn("mt-4 border-t pt-4", !open && "hidden print:block")}>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <Markdown>{linkSources(o.research_notes, sources)}</Markdown>
        </div>
        {sources.length > 0 && (
          <ol className="mt-4 list-decimal space-y-1 border-t pl-5 pt-3 text-xs text-muted-foreground">
            {sources.map((s, i) => (
              <li key={`${s.url}-${i}`}>
                <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
