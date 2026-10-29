import { ResultsList, type ResultItem } from "@/components/library/results-list";
import { toolInfo } from "@/lib/addons/catalog";
import { menuGroupLabel, toolNameL } from "@/lib/addons/i18n";
import { requireUser } from "@/lib/auth";
import { libraryText } from "@/lib/i18n/library";

export const metadata = { title: "Hasil saya" };
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const { supabase, profile } = await requireUser();
  const lang = profile.language === "en" ? "en" : "id";
  const t = libraryText(lang);

  const [runs, agents] = await Promise.all([
    // Hanya hasil asal (revisi dibuka dari halaman hasilnya) & hasil yang tidak disembunyikan.
    supabase
      .from("tool_runs")
      .select("id, tool, title, status, created_at")
      .eq("hidden", false)
      .is("revision_of", null)
      .is("agent_run_id", null)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("agent_runs").select("id, title, goal, status, created_at").order("created_at", { ascending: false }).limit(100),
  ]);

  const items: ResultItem[] = [
    ...(runs.data ?? []).map((r) => {
      const tool = r.tool as string;
      const info = toolInfo(tool);
      return {
        id: `r:${r.id}`,
        title: (r.title as string) || toolNameL(tool, lang),
        kind: toolNameL(tool, lang),
        group: info ? menuGroupLabel(info.addon, lang) : t.agentLabel,
        tool,
        failed: r.status === "error",
        at: r.created_at as string,
        href: `/tools/${tool}/${r.id}`,
      };
    }),
    ...(agents.data ?? []).map((a) => ({
      id: `a:${a.id}`,
      title: ((a.title as string) || (a.goal as string) || t.agentLabel).slice(0, 140),
      kind: t.agentLabel,
      group: "Agent",
      tool: null,
      failed: a.status === "error" || a.status === "failed",
      at: a.created_at as string,
      href: `/tools/agent/${a.id}`,
    })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-8 sm:pt-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t.resultsTitle}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{t.resultsSub}</p>
        <ResultsList lang={lang} items={items} now={Date.now()} />
      </div>
    </div>
  );
}
