"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calendarToIcs } from "@/lib/addons/exports";
import { initialMonth, monthGrid, shiftMonth, type CalendarEntry } from "@/lib/content-calendar";
import { downloadText } from "@/lib/i18n/exports";
import { libraryText } from "@/lib/i18n/library";
import type { Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

const PLATFORM_TONE: [RegExp, string][] = [
  [/insta|ig\b|reels/i, "bg-pink-500/12 text-pink-700 dark:text-pink-300"],
  [/tiktok/i, "bg-slate-500/15 text-slate-800 dark:text-slate-200"],
  [/whats|wa\b/i, "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"],
  [/face|fb\b/i, "bg-blue-500/12 text-blue-700 dark:text-blue-300"],
  [/youtube|yt\b/i, "bg-red-500/12 text-red-700 dark:text-red-300"],
];
const tone = (platform: string) => PLATFORM_TONE.find(([re]) => re.test(platform))?.[1] ?? "bg-primary/10 text-primary";

/** Kalender konten gabungan: tampilan bulan di laptop, daftar per hari di HP. */
export function ContentCalendar({ lang, entries, today }: { lang: Lang; entries: CalendarEntry[]; today: string }) {
  const t = libraryText(lang);
  const [month, setMonth] = useState(() => initialMonth(entries, today.slice(0, 7)));
  const [open, setOpen] = useState<CalendarEntry | null>(null);

  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEntry[]>();
    for (const e of entries) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [entries]);
  const monthEntries = entries.filter((e) => e.date.startsWith(month));
  const cells = monthGrid(month);
  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(t.locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const dayLabel = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString(t.locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" onClick={() => setMonth(shiftMonth(month, -1))} aria-label={t.prev}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setMonth(shiftMonth(month, 1))} aria-label={t.next}>
            <ChevronRight />
          </Button>
        </div>
        <h2 className="min-w-0 text-lg font-semibold capitalize">{monthLabel}</h2>
        {month !== today.slice(0, 7) && (
          <Button variant="ghost" size="sm" onClick={() => setMonth(today.slice(0, 7))}>
            {t.thisMonth}
          </Button>
        )}
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{t.postsThisMonth(monthEntries.length)}</span>
        {monthEntries.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadText(`kalender-konten-${month}.ics`, calendarToIcs(monthEntries, monthEntries[0].source), "text/calendar;charset=utf-8")}
          >
            <CalendarDays /> {t.exportIcs}
          </Button>
        )}
      </div>

      {/* Laptop: grid bulan */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-xs md:block">
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
          {t.weekdays.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const list = date ? (byDate.get(date) ?? []) : [];
            return (
              <div key={i} className={cn("min-h-28 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0", !date && "bg-muted/30")}>
                {date && (
                  <>
                    <span
                      className={cn(
                        "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs",
                        date === today ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {Number(date.slice(8))}
                    </span>
                    <div className="space-y-1">
                      {list.slice(0, 3).map((e) => (
                        <button
                          key={e.key}
                          type="button"
                          onClick={() => setOpen(e)}
                          className={cn("block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium hover:opacity-80", tone(e.platform))}
                          title={`${e.platform} · ${e.title}`}
                        >
                          {e.time && <span className="opacity-70">{e.time} </span>}
                          {e.title}
                        </button>
                      ))}
                      {list.length > 3 && (
                        <button type="button" onClick={() => setOpen(list[3])} className="px-1.5 text-[11px] text-muted-foreground hover:text-foreground">
                          {t.more(list.length - 3)}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* HP: daftar per hari */}
      <div className="space-y-3 md:hidden">
        {monthEntries.length ? (
          [...new Set(monthEntries.map((e) => e.date))].map((date) => (
            <section key={date}>
              <h3 className={cn("mb-1.5 px-1 text-xs font-semibold", date === today ? "text-primary" : "text-muted-foreground")}>{dayLabel(date)}</h3>
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {(byDate.get(date) ?? []).map((e) => (
                  <li key={e.key}>
                    <button type="button" onClick={() => setOpen(e)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                      <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", tone(e.platform))}>{e.platform}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                      {e.time && <span className="shrink-0 text-xs text-muted-foreground">{e.time}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t.emptyMonth}</p>
        )}
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={cn("rounded-md px-1.5 py-0.5 font-semibold", tone(open.platform))}>{open.platform}</span>
                  {open.format && <span className="rounded-md bg-muted px-1.5 py-0.5">{open.format}</span>}
                  <span className="text-muted-foreground">
                    {dayLabel(open.date)}
                    {open.time ? ` · ${open.time}` : ""}
                  </span>
                </div>
                <DialogTitle className="pr-6 text-lg">{open.title}</DialogTitle>
                <DialogDescription className="sr-only">{open.source}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {open.hook && <Field label={t.hook}>{open.hook}</Field>}
                {open.caption && (
                  <Field label={t.caption}>
                    <p className="whitespace-pre-line rounded-lg bg-muted/60 p-3">
                      {open.caption}
                      {open.hashtags?.length ? `\n\n${open.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}` : ""}
                    </p>
                  </Field>
                )}
                {open.cta && <Field label={t.cta}>{open.cta}</Field>}
                {open.visual && <Field label={t.visual}>{open.visual}</Field>}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {open.caption && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const tags = open.hashtags?.length ? `\n\n${open.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}` : "";
                      void navigator.clipboard.writeText(`${open.caption}${tags}`).then(() => toast.success(t.copied));
                    }}
                  >
                    <Copy /> {t.copyCaption}
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/tools/calendar/${open.runId}`}>
                    <ExternalLink /> {t.openSource}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div>{children}</div>
    </div>
  );
}
