"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Target, Trash2 } from "lucide-react";
import { useApp } from "@/components/app/app-context";
import { settingsText } from "@/lib/i18n/settings";
import type { OutcomeResult } from "@/lib/ai/outcomes";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  chatId: string;
  result: OutcomeResult;
  topic: string;
  note: string | null;
  date: string;
  project: string | null;
}

const TONE: Record<OutcomeResult, string> = {
  berhasil: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  biasa: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  gagal: "bg-red-500/12 text-red-700 dark:text-red-400",
};

/** Pengaturan → Memori: daftar Ingatan Hasil (laporan hasil strategi) + hapus. */
export function OutcomeList({ items: initial }: { items: Item[] }) {
  const { lang, t: common } = useApp();
  const t = settingsText(lang);
  const [items, setItems] = useState(initial);

  async function remove(id: string) {
    const res = await fetch("/api/outcome", { method: "DELETE", body: JSON.stringify({ id }) }).catch(() => null);
    if (!res?.ok) return toast.error(t.errSaveFailed);
    setItems((list) => list.filter((x) => x.id !== id));
    toast.success(t.outcomeDeleted);
  }

  return (
    <section className="mt-10 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Target className="size-4 text-primary" /> {t.outcomesTitle}
      </h3>
      <p className="text-xs text-muted-foreground">{t.outcomesDesc}</p>
      {items.length ? (
        <ul className="divide-y rounded-xl border">
          {items.map((o) => (
            <li key={o.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", TONE[o.result])}>
                {t.outcomeLabels[o.result]}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/chat/${o.chatId}`} className="line-clamp-2 font-medium hover:underline">
                  {o.topic}
                </Link>
                {o.note && <p className="mt-0.5 text-xs text-muted-foreground">“{o.note}”</p>}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {o.date}
                  {o.project ? ` · ${o.project}` : ""}
                </p>
              </div>
              <button
                onClick={() => remove(o.id)}
                aria-label={common.delete}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground">{t.outcomesEmpty}</p>
      )}
    </section>
  );
}
