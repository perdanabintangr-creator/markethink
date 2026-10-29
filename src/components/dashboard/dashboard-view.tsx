import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ChevronRight, Megaphone, MessageSquareText, PenLine, Search, type LucideIcon } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { timeAgo, workspaceUiText, type WorkspaceUiText } from "@/lib/i18n/workspace-ui";
import type { Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";
import { DashboardAsk } from "./dashboard-ask";

export interface DashboardData {
  firstName: string;
  /** Jam sekarang menurut WIB (untuk sapaan). */
  hour: number;
  researchAllowed: boolean;
  /** Langkah awal untuk pengguna baru; kartu hilang sendiri bila semuanya selesai. */
  steps: { project: boolean; kit: boolean; chat: boolean; tool: boolean };
  firstProjectId: string | null;
  recent: { id: string; title: string; tool?: string; status: "done" | "replying" | "failed"; at: string; href: string }[];
  /** Perubahan terbaru dari Pantau mingguan (bila ada minggu ini). */
  news: { title: string; tool: string; changes: string[]; href: string | null } | null;
  now: number;
}

/** Beranda: sengaja ringkas agar pengguna baru langsung paham harus mulai dari mana. */
export function DashboardView({ lang, data }: { lang: Lang; data: DashboardData }) {
  const t = workspaceUiText(lang);
  const steps: { done: boolean; title: string; sub: string; href: string }[] = [
    { done: data.steps.project, title: t.stepProject, sub: t.stepProjectSub, href: "/workspaces" },
    { done: data.steps.kit, title: t.stepKit, sub: t.stepKitSub, href: data.firstProjectId ? `/workspaces/${data.firstProjectId}` : "/workspaces" },
    { done: data.steps.chat, title: t.stepChat, sub: t.stepChatSub, href: "/chat" },
    { done: data.steps.tool, title: t.stepTool, sub: t.stepToolSub, href: "/tools" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 px-4 pb-12 pt-10 sm:pt-16">
        <div className="space-y-5">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.greeting(data.hour, data.firstName)}</h1>
            <p className="mt-1.5 text-muted-foreground">{t.homeSub}</p>
          </div>
          <DashboardAsk lang={lang} researchAllowed={data.researchAllowed} />
        </div>

        <section>
          <p className="mb-3 text-center text-sm text-muted-foreground">{t.orPick}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card href={`/chat?draft=${encodeURIComponent(t.cardCaptionDraft)}`} icon={PenLine} title={t.cardCaption} sub={t.cardCaptionSub} />
            <Card href="/tools/calendar" icon={CalendarDays} title={t.cardCalendar} sub={t.cardCalendarSub} />
            <Card href="/tools/adcopy" icon={Megaphone} title={t.cardAds} sub={t.cardAdsSub} />
            <Card href="/tools/competitor" icon={Search} title={t.cardCompetitor} sub={t.cardCompetitorSub} />
          </div>
        </section>

        {data.news && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{t.newsTitle}</p>
            <p className="mt-1 font-medium">{data.news.title}</p>
            <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
              {data.news.changes.slice(0, 2).map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
            {data.news.href && (
              <Link href={data.news.href} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                {t.openResult} <ArrowRight className="size-3.5" />
              </Link>
            )}
          </section>
        )}

        {doneCount < steps.length && (
          <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">{t.startTitle}</h2>
              <span className="text-xs text-muted-foreground">{t.startProgress(doneCount, steps.length)}</span>
            </div>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>
            <ol className="space-y-1">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <Link
                    href={s.href}
                    className={cn("group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent", s.done && "opacity-60")}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        s.done ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.done ? <Check className="size-4" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm font-medium", s.done && "line-through")}>{s.title}</span>
                      {!s.done && <span className="block text-xs text-muted-foreground">{s.sub}</span>}
                    </span>
                    {!s.done && <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        {data.recent.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold">{t.continueTitle}</h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
              {data.recent.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/60">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      {r.tool ? <ToolIcon id={r.tool} className="size-4" /> : <MessageSquareText className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.title}</span>
                    <Status status={r.status} t={t} />
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(t, r.at, data.now)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Card({ href, icon: Icon, title, sub }: { href: string; icon: LucideIcon; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-[18px]" />
      </span>
      <span className="text-sm font-semibold leading-tight">{title}</span>
      <span className="text-xs leading-snug text-muted-foreground">{sub}</span>
    </Link>
  );
}

function Status({ status, t }: { status: DashboardData["recent"][number]["status"]; t: WorkspaceUiText }) {
  if (status === "replying") return <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{t.statusReplying}</span>;
  if (status === "failed") return <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">{t.statusFailed}</span>;
  return null;
}
