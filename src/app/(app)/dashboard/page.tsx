import { DashboardView, type DashboardData } from "@/components/dashboard/dashboard-view";
import { UNLIMITED_CREDITS } from "@/lib/addons/format";
import { toolNameL } from "@/lib/addons/i18n";
import { requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { brandKitCompleteness, usageByDay } from "@/lib/dashboard";
import { isGenerating } from "@/lib/types";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireUser();
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY).toISOString();
  const lang = profile.language === "en" ? "en" : "id";

  const [credits, ledger, runsCount, runs, chatsCount, chats, watchers, workspaces, flag] = await Promise.all([
    getCreditStatus(user.id),
    supabase.from("credit_ledger").select("delta, reason, created_at").gte("created_at", new Date(now - 8 * DAY).toISOString()).limit(3000),
    supabase.from("tool_runs").select("id", { count: "exact", head: true }).eq("hidden", false).gte("created_at", since7),
    supabase.from("tool_runs").select("id, tool, title, status, created_at").eq("hidden", false).order("created_at", { ascending: false }).limit(6),
    supabase.from("chats").select("id", { count: "exact", head: true }).gte("updated_at", since7),
    supabase.from("chats").select("id, title, updated_at, generating_at").order("updated_at", { ascending: false }).limit(6),
    supabase
      .from("tool_watchers")
      .select("id, tool, title, last_run_at, last_run_id, next_run_at, source_run_id")
      .eq("active", true)
      .order("last_run_at", { ascending: false, nullsFirst: false })
      .limit(5),
    supabase.from("workspaces").select("id, name, brand_kit").order("sort_order", { ascending: true, nullsFirst: true }).order("updated_at", { ascending: false }).limit(5),
    profile.role === "admin"
      ? Promise.resolve({ data: { enabled: true } })
      : supabase.from("feature_flags").select("enabled").eq("plan_id", profile.plan_id).eq("key", "research").maybeSingle(),
  ]);

  // Perubahan terbaru dari pantauan (disimpan di hasil run terakhir sebagai `watch_changes`).
  const lastRunIds = (watchers.data ?? []).map((w) => w.last_run_id as string | null).filter((id): id is string => Boolean(id));
  const changesById = new Map<string, string[]>();
  if (lastRunIds.length) {
    const { data } = await supabase.from("tool_runs").select("id, watch_changes:output->watch_changes").in("id", lastRunIds);
    for (const r of data ?? []) {
      const list = (r as { id: string; watch_changes: unknown }).watch_changes;
      if (Array.isArray(list)) changesById.set(r.id as string, list.filter((x): x is string => typeof x === "string"));
    }
  }
  const watcherRows = (watchers.data ?? []).map((w) => {
    const runId = (w.last_run_id ?? w.source_run_id) as string | null;
    return {
      id: w.id as string,
      tool: w.tool as string,
      title: (w.title as string) || toolNameL(w.tool as string, lang),
      changes: (w.last_run_id && changesById.get(w.last_run_id as string)) || [],
      lastRunAt: (w.last_run_at as string | null) ?? null,
      nextRunAt: (w.next_run_at as string | null) ?? null,
      href: runId ? `/tools/${w.tool}/${runId}` : null,
    };
  });
  // Perubahan dianggap "baru" bila pantauan berjalan dalam 7 hari terakhir.
  const watchChanges = watcherRows.filter((w) => w.changes.length && w.lastRunAt && Date.parse(w.lastRunAt) >= now - 7 * DAY).reduce((n, w) => n + w.changes.length, 0);

  const recent: DashboardData["recent"] = [
    ...(runs.data ?? []).map((r) => ({
      id: `r:${r.id}`,
      kind: "run" as const,
      title: (r.title as string) || toolNameL(r.tool as string, lang),
      tool: r.tool as string,
      status: r.status === "error" ? ("failed" as const) : r.status === "ok" ? ("done" as const) : ("running" as const),
      at: r.created_at as string,
      href: `/tools/${r.tool}/${r.id}`,
    })),
    ...(chats.data ?? []).map((c) => ({
      id: `c:${c.id}`,
      kind: "chat" as const,
      title: (c.title as string) || (lang === "en" ? "New chat" : "Chat baru"),
      status: isGenerating(c.generating_at as string | null) ? ("replying" as const) : ("done" as const),
      at: c.updated_at as string,
      href: `/chat/${c.id}`,
    })),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 7);

  const unlimited = credits.monthLimit >= UNLIMITED_CREDITS;
  const wibNow = new Date(now + 7 * 3_600_000);
  const data: DashboardData = {
    firstName: (profile.full_name ?? "").trim().split(/\s+/)[0] ?? "",
    hour: wibNow.getUTCHours(),
    dateLabel: new Date(now).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }),
    researchAllowed: Boolean(flag.data?.enabled),
    credits: { used: Math.max(0, credits.used), limit: credits.monthLimit, unlimited },
    chats7: chatsCount.count ?? 0,
    runs7: runsCount.count ?? 0,
    watchersActive: watcherRows.length,
    watchChanges,
    usage: usageByDay((ledger.data ?? []) as { delta: number; reason: string | null; created_at: string }[], 7, now),
    recent,
    watchers: watcherRows,
    projects: (workspaces.data ?? []).map((w) => ({ id: w.id as string, name: w.name as string, kit: brandKitCompleteness(w.brand_kit) })),
    now,
  };

  return <DashboardView lang={lang} data={data} />;
}
