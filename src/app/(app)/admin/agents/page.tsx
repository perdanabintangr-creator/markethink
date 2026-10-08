import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { AgentIcon } from "@/components/agent-icon";
import { toggleAgent } from "../actions";

export default async function AdminAgentsPage() {
  const { data: agents } = await createAdminClient()
    .from("agents")
    .select("id, slug, name, category, icon, default_tier, is_active, sort_order")
    .order("sort_order");
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">Agents disimpan di database — perubahan langsung live tanpa deploy.</p>
        <Button asChild><Link href="/admin/agents/new">+ Agent baru</Link></Button>
      </div>
      <ul className="divide-y rounded-xl border">
        {(agents ?? []).map((a) => (
          <li key={a.id} className="flex items-center gap-3 p-3 text-sm">
            <AgentIcon name={a.icon} className="size-4 text-primary" />
            <span className="flex-1">
              <span className="font-medium">{a.name}</span>{" "}
              <span className="text-xs text-muted-foreground">/{a.slug} · {a.category} · {a.default_tier} · #{a.sort_order}</span>
            </span>
            <form action={toggleAgent.bind(null, a.id, !a.is_active)}>
              <Button size="sm" variant={a.is_active ? "outline" : "secondary"}>{a.is_active ? "Aktif" : "Nonaktif"}</Button>
            </form>
            <Button asChild size="sm" variant="ghost"><Link href={`/admin/agents/${a.id}`}>Edit</Link></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
