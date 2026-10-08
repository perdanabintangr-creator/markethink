import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AgentIcon } from "@/components/agent-icon";
import type { Agent } from "@/lib/types";

export const metadata = { title: "Marketing Agents" };

const CATEGORY_LABEL: Record<string, string> = {
  strategi: "Strategi",
  riset: "Riset",
  konten: "Konten",
  iklan: "Iklan & KOL",
  umkm: "UMKM",
  bisnis: "Bisnis & Klien",
  umum: "Lainnya",
};

const TIER_BADGE: Record<string, string> = { junior: "Junior", senior: "Senior", associate: "Associate" };

export default async function AgentsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("agents")
    .select("id, slug, name, description, icon, category, default_tier, output_canvas")
    .eq("is_active", true)
    .order("sort_order");
  const agents = (data ?? []) as Pick<Agent, "id" | "slug" | "name" | "description" | "icon" | "category" | "default_tier" | "output_canvas">[];
  const categories = [...new Set(agents.map((a) => a.category))];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Marketing Agents</h1>
        <p className="mt-1 text-muted-foreground">
          Template siap pakai dengan form terstruktur — isi brief singkat, dapatkan output lengkap.
        </p>
        {categories.map((cat) => (
          <section key={cat} className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABEL[cat] ?? cat}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agents
                .filter((a) => a.category === cat)
                .map((a) => (
                  <Link
                    key={a.id}
                    href={`/agents/${a.slug}`}
                    className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <AgentIcon name={a.icon} className="size-5" />
                      </span>
                      <span className="font-medium">{a.name}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Rekomendasi: Markethink {TIER_BADGE[a.default_tier]}
                      {a.output_canvas ? " · buka di Canvas" : ""}
                    </p>
                  </Link>
                ))}
            </div>
          </section>
        ))}
        {!agents.length && <p className="mt-8 text-muted-foreground">Belum ada agent aktif.</p>}
      </div>
    </div>
  );
}
