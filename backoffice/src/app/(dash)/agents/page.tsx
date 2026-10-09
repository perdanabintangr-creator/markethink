import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { Button } from "@/components/ui/button";
import { AgentIcon } from "@/components/agent-icon";
import { PageTitle } from "@/components/backoffice/stat";
import { toggleAgent } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing Agents" };

export default async function AgentsPage() {
  const { isOwner } = await requireBackoffice();
  if (!isOwner) redirect("/");
  const { data: agents } = await createAdminClient()
    .from("agents")
    .select("id, slug, name, category, icon, default_tier, is_active, sort_order")
    .order("sort_order");
  return (
    <div className="space-y-4">
      <PageTitle
        title="Marketing Agents"
        description="Template agent yang tampil di aplikasi AI. Perubahan langsung live tanpa deploy."
        actions={
          <Button asChild size="sm">
            <Link href="/agents/new">+ Agent baru</Link>
          </Button>
        }
      />
      <ul className="divide-y rounded-xl border bg-background">
        {(agents ?? []).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <AgentIcon name={a.icon} className="size-4 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{a.name}</span>{" "}
              <span className="text-xs text-muted-foreground">
                /{a.slug} · {a.category} · {a.default_tier} · urutan {a.sort_order}
              </span>
            </span>
            <form action={toggleAgent.bind(null, a.id, !a.is_active)}>
              <Button size="sm" variant={a.is_active ? "outline" : "secondary"}>{a.is_active ? "Aktif" : "Nonaktif"}</Button>
            </form>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/agents/${a.id}`}>Edit</Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
