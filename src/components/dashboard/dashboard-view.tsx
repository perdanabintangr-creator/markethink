import Link from "next/link";
import {
  ArrowUpRight,
  BrainCircuit,
  Coins,
  Eye,
  FolderOpen,
  LayoutGrid,
  Megaphone,
  MessageSquareText,
  PenLine,
  Search,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { toolNameL } from "@/lib/addons/i18n";
import { niceMax, type UsageDay } from "@/lib/dashboard";
import { timeAgo, workspaceUiText, type WorkspaceUiText } from "@/lib/i18n/workspace-ui";
import type { Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";
import { DashboardAsk } from "./dashboard-ask";

export interface DashboardData {
  firstName: string;
  /** Jam sekarang menurut WIB (untuk sapaan). */
  hour: number;
  dateLabel: string;
  researchAllowed: boolean;
  credits: { used: number; limit: number; unlimited: boolean };
  chats7: number;
  runs7: number;
  watchersActive: number;
  watchChanges: number;
  usage: UsageDay[];
  recent: {
    id: string;
    kind: "chat" | "run";
    title: string;
    tool?: string;
    status: "done" | "running" | "failed" | "replying";
    at: string;
    href: string;
  }[];
  watchers: { id: string; tool: string; title: string; changes: string[]; lastRunAt: string | null; nextRunAt: string | null; href: string | null }[];
  projects: { id: string; name: string; kit: number }[];
  now: number;
}

export function DashboardView({ lang, data }: { lang: Lang; data: DashboardData }) {
  const t = workspaceUiText(lang);
  const fmt = (n: number) => n.toLocaleString(lang === "en" ? "en-US" : "id-ID");
  const rupiah = `Rp${fmt(data.credits.used * 100)}`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.greeting(data.hour, data.firstName)}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{t.dashSub(data.dateLabel)}</p>
          </div>
        </div>

        <DashboardAsk lang={lang} researchAllowed={data.researchAllowed} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={Coins} label={t.statCredits} value={fmt(data.credits.used)} sub={t.statCreditsSub(rupiah)} />
          <Stat icon={MessageSquareText} label={t.statChats} value={fmt(data.chats7)} sub={t.last7} />
          <Stat icon={Wrench} label={t.statRuns} value={fmt(data.runs7)} sub={t.last7} />
          <Stat
            icon={Eye}
            label={t.statWatchers}
            value={fmt(data.watchersActive)}
            sub={t.watchersSub(data.watchChanges)}
            tone={data.watchChanges ? "warn" : undefined}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="min-w-0 space-y-4 lg:col-span-2">
            <Panel title={t.quickStart} action={<PanelLink href="/tools">{t.allTools}</PanelLink>}>
              <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4">
                <QuickAction href="/chat" icon={PenLine} title={t.qaCaption} sub={t.qaCaptionSub} />
                <QuickAction href="/tools/adcopy" icon={Megaphone} title={t.qaAds} sub={t.qaAdsSub} />
                <QuickAction href="/tools/competitor" icon={Search} title={t.qaCompetitor} sub={t.qaCompetitorSub} />
                <QuickAction href="/tools/agent" icon={BrainCircuit} title={t.qaAgent} sub={t.qaAgentSub} />
              </div>
            </Panel>

            <Panel
              title={t.usageChart}
              action={
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <Legend className="bg-primary" label={t.legendTools} />
                  <Legend className="bg-primary-2/60" label={t.legendChat} />
                  <Legend className="bg-amber-400/80" label={t.legendMedia} />
                </div>
              }
            >
              <div className="p-4">
                <UsageChart days={data.usage} lang={lang} emptyText={t.noUsage} />
              </div>
            </Panel>

            <Panel title={t.recent}>
              {data.recent.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                        <th className="w-full px-4 py-2 font-medium">{t.colName}</th>
                        <th className="hidden px-4 py-2 font-medium sm:table-cell">{t.colType}</th>
                        <th className="px-4 py-2 font-medium">{t.colStatus}</th>
                        <th className="whitespace-nowrap px-4 py-2 text-right font-medium">{t.colTime}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((r) => (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="w-full max-w-0 px-4 py-2.5">
                            <Link href={r.href} className="flex min-w-0 items-center gap-2.5 font-medium hover:text-primary">
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                                {r.tool ? <ToolIcon id={r.tool} className="size-3.5" /> : <MessageSquareText className="size-3.5" />}
                              </span>
                              <span className="truncate">{r.title}</span>
                            </Link>
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-2.5 text-muted-foreground sm:table-cell">
                            {r.tool ? toolNameL(r.tool, lang) : t.typeChat}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <StatusBadge status={r.status} t={t} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right text-muted-foreground">{timeAgo(t, r.at, data.now)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">{t.emptyRecent}</p>
              )}
            </Panel>
          </div>

          <div className="min-w-0 space-y-4">
            <Panel
              title={t.watchTitle}
              action={data.watchChanges ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">{data.watchChanges}</span> : null}
            >
              {data.watchers.length ? (
                <ul className="divide-y">
                  {data.watchers.map((w) => (
                    <li key={w.id} className="flex gap-3 px-4 py-3">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                        <ToolIcon id={w.tool} className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{w.title}</p>
                        {w.changes.length ? (
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {w.changes.slice(0, 2).map((c, i) => (
                              <li key={i} className="line-clamp-2">• {c}</li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {w.nextRunAt && <span>{t.watchNext(new Date(w.nextRunAt).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }))}</span>}
                          {w.href && (
                            <Link href={w.href} className="font-medium text-primary hover:underline">
                              {t.watchOpen}
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">{t.watchEmpty}</p>
              )}
            </Panel>

            <Panel title={t.projectsTitle} action={<PanelLink href="/workspaces">{t.manage}</PanelLink>}>
              {data.projects.length ? (
                <ul className="divide-y">
                  {data.projects.map((p) => (
                    <li key={p.id} className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <FolderOpen className="size-4 shrink-0 text-primary" />
                        <Link href={`/chat?workspace=${p.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary">
                          {p.name}
                        </Link>
                        {p.kit < 100 && (
                          <Link href={`/workspaces/${p.id}`} className="shrink-0 text-xs font-medium text-primary hover:underline">
                            {t.completeKit}
                          </Link>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2 pl-6">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${p.kit}%` }} />
                        </div>
                        <span className="w-24 text-right text-[11px] tabular-nums text-muted-foreground">{t.brandKit(p.kit)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">{t.projectsEmpty}</p>
                  <Link href="/workspaces" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    {t.newProject} <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              )}
            </Panel>

            <Link href="/tools" className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40">
              <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-2 text-white">
                <LayoutGrid className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t.smartTools}</span>
                <span className="block truncate text-xs text-muted-foreground">{t.allTools}</span>
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-xs font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

function Stat({ icon: Icon, label, value, sub, tone }: { icon: LucideIcon; label: string; value: string; sub: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{label}</span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className={cn("mt-0.5 truncate text-xs", tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{sub}</p>
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, sub }: { href: string; icon: LucideIcon; title: string; sub: string }) {
  return (
    <Link href={href} className="group flex flex-col gap-2 rounded-lg border p-3 transition-all hover:border-primary/40 hover:shadow-sm">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-2 text-white">
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-semibold leading-tight">{title}</span>
      <span className="text-xs leading-snug text-muted-foreground">{sub}</span>
    </Link>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className={cn("size-2 rounded-sm", className)} />
      {label}
    </span>
  );
}

function StatusBadge({ status, t }: { status: DashboardData["recent"][number]["status"]; t: WorkspaceUiText }) {
  const map = {
    done: ["bg-emerald-500/12 text-emerald-700 dark:text-emerald-400", t.statusDone],
    running: ["bg-primary/12 text-primary", t.statusRunning],
    replying: ["bg-primary/12 text-primary", t.statusReplying],
    failed: ["bg-destructive/12 text-destructive", t.statusFailed],
  } as const;
  const [cls, label] = map[status];
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>{label}</span>;
}

/** Grafik batang bertumpuk 7 hari; satu skala untuk sumbu dan batang. */
function UsageChart({ days, lang, emptyText }: { days: UsageDay[]; lang: Lang; emptyText: string }) {
  const totals = days.map((d) => d.chat + d.tools + d.media);
  const peak = Math.max(...totals, 0);
  const max = niceMax(peak);
  const W = 640;
  const H = 180;
  const L = 34;
  const B = 22;
  const T = 8;
  const y = (v: number) => H - B - (v / max) * (H - B - T);
  const slot = (W - L) / days.length;
  const bw = Math.min(34, slot * 0.5);
  const dayLabel = (iso: string) =>
    new Date(`${iso}T00:00:00+07:00`).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { weekday: "short", timeZone: "Asia/Jakarta" });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Kredit per hari">
        {[0, max / 2, max].map((g) => (
          <g key={g}>
            <line x1={L} x2={W} y1={y(g)} y2={y(g)} className="stroke-border" strokeDasharray={g ? "3 3" : undefined} vectorEffect="non-scaling-stroke" />
            <text x={L - 6} y={y(g) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {Math.round(g)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = L + slot * i + (slot - bw) / 2;
          const segs: [number, string][] = [
            [d.tools, "fill-primary"],
            [d.chat, "fill-primary-2/60"],
            [d.media, "fill-amber-400/80"],
          ];
          let base = 0;
          return (
            <g key={d.day}>
              <title>{`${dayLabel(d.day)}: ${totals[i]}`}</title>
              {segs.map(([v, cls], k) => {
                if (v <= 0) return null;
                const top = y(base + v);
                const h = y(base) - top;
                base += v;
                return <rect key={k} x={x} y={top} width={bw} height={Math.max(1, h - (k ? 1 : 0))} rx={3} className={cls} />;
              })}
              <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {dayLabel(d.day)}
              </text>
            </g>
          );
        })}
      </svg>
      {peak === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{emptyText}</p>}
    </div>
  );
}
