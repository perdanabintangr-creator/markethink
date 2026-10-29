import { DashboardView, type DashboardData } from "@/components/dashboard/dashboard-view";
import { toolNameL } from "@/lib/addons/i18n";
import { requireUser } from "@/lib/auth";
import { brandKitCompleteness } from "@/lib/dashboard";
import { isGenerating } from "@/lib/types";

export const metadata = { title: "Beranda" };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function DashboardPage() {
  const { supabase, profile } = await requireUser();
  const now = Date.now();
  const lang = profile.language === "en" ? "en" : "id";

  const [runs, chats, workspaces, watchers, flag] = await Promise.all([
    supabase.from("tool_runs").select("id, tool, title, status, created_at").eq("hidden", false).order("created_at", { ascending: false }).limit(4),
    supabase.from("chats").select("id, title, updated_at, generating_at").order("updated_at", { ascending: false }).limit(4),
    supabase.from("workspaces").select("id, brand_kit").order("sort_order", { ascending: true, nullsFirst: true }).order("updated_at", { ascending: false }),
    supabase
      .from("tool_watchers")
      .select("tool, title, last_run_at, last_run_id")
      .eq("active", true)
      .gte("last_run_at", new Date(now - 7 * DAY).toISOString())
      .order("last_run_at", { ascending: false })
      .limit(1),
    profile.role === "admin"
      ? Promise.resolve({ data: { enabled: true } })
      : supabase.from("feature_flags").select("enabled").eq("plan_id", profile.plan_id).eq("key", "research").maybeSingle(),
  ]);

  // Kabar pantauan minggu ini (ringkasan perubahan disimpan di hasil run terakhir).
  let news: DashboardData["news"] = null;
  const w = watchers.data?.[0];
  if (w?.last_run_id) {
    const { data } = await supabase.from("tool_runs").select("watch_changes:output->watch_changes").eq("id", w.last_run_id).maybeSingle();
    const changes = (data as { watch_changes?: unknown } | null)?.watch_changes;
    if (Array.isArray(changes) && changes.length)
      news = {
        title: (w.title as string) || toolNameL(w.tool as string, lang),
        tool: w.tool as string,
        changes: changes.filter((c): c is string => typeof c === "string"),
        href: `/tools/${w.tool}/${w.last_run_id}`,
      };
  }

  const recent: DashboardData["recent"] = [
    ...(runs.data ?? []).map((r) => ({
      id: `r:${r.id}`,
      title: (r.title as string) || toolNameL(r.tool as string, lang),
      tool: r.tool as string,
      status: r.status === "error" ? ("failed" as const) : ("done" as const),
      at: r.created_at as string,
      href: `/tools/${r.tool}/${r.id}`,
    })),
    ...(chats.data ?? []).map((c) => ({
      id: `c:${c.id}`,
      title: (c.title as string) || (lang === "en" ? "New chat" : "Chat baru"),
      status: isGenerating(c.generating_at as string | null) ? ("replying" as const) : ("done" as const),
      at: c.updated_at as string,
      href: `/chat/${c.id}`,
    })),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 4);

  const projects = workspaces.data ?? [];
  const data: DashboardData = {
    firstName: (profile.full_name ?? "").trim().split(/\s+/)[0] ?? "",
    hour: new Date(now + 7 * 3_600_000).getUTCHours(),
    researchAllowed: Boolean(flag.data?.enabled),
    steps: {
      project: projects.length > 0,
      kit: projects.some((p) => brandKitCompleteness(p.brand_kit) >= 50),
      chat: (chats.data ?? []).length > 0,
      tool: (runs.data ?? []).length > 0,
    },
    firstProjectId: (projects[0]?.id as string | undefined) ?? null,
    recent,
    news,
    now,
  };

  return <DashboardView lang={lang} data={data} />;
}
