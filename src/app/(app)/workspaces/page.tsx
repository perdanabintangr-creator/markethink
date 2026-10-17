import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { settingsText } from "@/lib/i18n/settings";
import { createWorkspace } from "./actions";

export const metadata = { title: "Projects" };

export default async function WorkspacesPage() {
  const { supabase, profile } = await requireUser();
  const t = settingsText(profile.language);
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, brand_kit, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="mt-1 text-muted-foreground">{t.projectsDesc}</p>

        <form action={createWorkspace} className="mt-6 flex gap-2">
          <Input name="name" placeholder={t.newProjectPlaceholder} required maxLength={80} />
          <Button>
            <Plus /> {t.create}
          </Button>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(workspaces ?? []).map((w) => {
            const kit = (w.brand_kit ?? {}) as Record<string, string>;
            const filled = Object.values(kit).filter(Boolean).length;
            return (
              <Link key={w.id} href={`/workspaces/${w.id}`} className="rounded-xl border bg-card p-4 hover:bg-accent/50">
                <div className="flex items-center gap-2 font-medium">
                  <Briefcase className="size-4 text-primary" /> {w.name}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {kit.products || kit.usp || t.brandKitEmpty}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">{t.brandKitFilledOf(filled)}</p>
              </Link>
            );
          })}
        </div>
        {!workspaces?.length && (
          <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t.noProjects}
          </p>
        )}
      </div>
    </div>
  );
}
