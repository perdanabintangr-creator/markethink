import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAgentRun } from "@/lib/agent/server";
import { AgentMission } from "@/components/agent/agent-mission";
import type { ToolFileLite } from "@/lib/addons/format";

export const metadata = { title: "Marqthink Agent" };
export const dynamic = "force-dynamic";

export default async function AgentRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { profile } = await requireUser();
  const admin = createAdminClient();
  const run = await loadAgentRun(admin, id, profile.id);
  if (!run) notFound();
  const ids = run.plan.map((p) => p.run_id).filter(Boolean) as string[];
  const { data: results } = ids.length
    ? await admin.from("tool_runs").select("id, tool, title, files, status").in("id", ids).eq("user_id", profile.id)
    : { data: [] };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:py-8">
        <Link href="/tools/agent" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Marqthink Agent
        </Link>
        <AgentMission
          initial={run}
          initialResults={(results ?? []).map((r) => ({ ...r, files: (r.files ?? []) as ToolFileLite[] })) as never}
        />
      </div>
    </div>
  );
}
