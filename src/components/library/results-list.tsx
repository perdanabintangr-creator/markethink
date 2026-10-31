"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BrainCircuit, Search } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { dateBucket } from "@/lib/content-calendar";
import { libraryText } from "@/lib/i18n/library";
import type { Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

export interface ResultItem {
  id: string;
  title: string;
  /** Nama tool (atau "Marqthink Agent"). */
  kind: string;
  /** Kelompok untuk filter (mis. "Konten & Sosmed", "Agent"). */
  group: string;
  tool: string | null;
  failed: boolean;
  at: string;
  href: string;
}

/** Daftar "Hasil saya": cari + filter kelompok + dikelompokkan per waktu. */
export function ResultsList({ lang, items, now }: { lang: Lang; items: ResultItem[]; now: number }) {
  const t = libraryText(lang);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const groups = useMemo(() => [...new Set(items.map((i) => i.group))], [items]);

  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((i) => (!group || i.group === group) && words.every((w) => `${i.title} ${i.kind}`.toLowerCase().includes(w)));
  }, [items, q, group]);

  const sections = (["today", "week", "older"] as const)
    .map((b) => ({ id: b, label: t[b], items: shown.filter((i) => dateBucket(i.at, now) === b) }))
    .filter((s) => s.items.length);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(t.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="flex items-center gap-2 rounded-xl border bg-card px-3 shadow-xs focus-within:ring-2 focus-within:ring-ring/30">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchResults}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {[null, ...groups].map((g) => (
              <button
                key={g ?? "all"}
                type="button"
                onClick={() => setGroup(g)}
                aria-pressed={group === g}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  group === g ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {g ?? t.all}
              </button>
            ))}
          </div>
        )}
      </div>

      {sections.length ? (
        sections.map((s) => (
          <section key={s.id}>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
              {s.items.map((i) => (
                <li key={i.id}>
                  <Link href={i.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/60">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      {i.tool ? <ToolIcon id={i.tool} className="size-4" /> : <BrainCircuit className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{i.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{i.kind}</span>
                    </span>
                    {i.failed && <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">{t.failed}</span>}
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{fmt(i.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {items.length ? (
            t.noMatch
          ) : (
            <>
              <p>{t.noResults}</p>
              <Link href="/tools" className="mt-3 inline-block font-medium text-primary hover:underline">
                {t.openTools}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
