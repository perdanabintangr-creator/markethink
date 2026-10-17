import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { BrandKit } from "@/lib/ai/prompt";
import { settingsText } from "@/lib/i18n/settings";
import { BrandKitForm } from "./brand-kit-form";
import { KnowledgeFiles } from "./knowledge-files";
import { DeleteWorkspaceButton } from "./delete-button";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, profile } = await requireUser();
  const t = settingsText(profile.language);
  const { data: ws } = await supabase.from("workspaces").select("id, name, brand_kit").eq("id", id).maybeSingle();
  if (!ws) notFound();
  const [{ data: files }, { data: chats }] = await Promise.all([
    supabase
      .from("workspace_files")
      .select("id, name, size, status, error, chunk_count, created_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("chats").select("id, title, updated_at").eq("workspace_id", id).order("updated_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/workspaces" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {t.allProjects}
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{ws.name}</h1>
          <Button asChild>
            <Link href={`/chat?workspace=${ws.id}`}>
              <MessageSquarePlus /> {t.chatInProject}
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="mb-3 font-semibold">Brand Kit</h2>
            <BrandKitForm workspaceId={ws.id} name={ws.name} kit={(ws.brand_kit ?? {}) as BrandKit} />
          </section>
          <aside className="space-y-8">
            <section>
              <h2 className="mb-1 font-semibold">{t.knowledge}</h2>
              <p className="mb-3 text-xs text-muted-foreground">{t.knowledgeDesc}</p>
              <KnowledgeFiles workspaceId={ws.id} files={files ?? []} />
            </section>
            <section>
              <h2 className="mb-2 font-semibold">{t.recentChats}</h2>
              <ul className="space-y-1 text-sm">
                {(chats ?? []).map((c) => (
                  <li key={c.id}>
                    <Link href={`/chat/${c.id}`} className="block truncate rounded-md px-2 py-1 hover:bg-accent">
                      {c.title}
                    </Link>
                  </li>
                ))}
                {!chats?.length && <li className="text-muted-foreground">{t.noChats}</li>}
              </ul>
            </section>
            <DeleteWorkspaceButton workspaceId={ws.id} />
          </aside>
        </div>
      </div>
    </div>
  );
}
