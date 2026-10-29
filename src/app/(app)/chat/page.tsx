import { ChatView } from "@/components/chat/chat-view";
import type { ProjectHomeData } from "@/components/chat/project-home";
import { requireUser } from "@/lib/auth";
import { publicTiers } from "@/lib/tiers-public";

export const metadata = { title: "Chat" };

/** Data halaman depan project (logo, warna, jumlah file, daftar chat) bila chat baru dibuka dari sebuah project. */
async function loadProject(workspaceId: string): Promise<ProjectHomeData | null> {
  const { supabase } = await requireUser();
  const [{ data: ws }, { data: chats }, { count }] = await Promise.all([
    supabase.from("workspaces").select("id, name, brand_kit").eq("id", workspaceId).maybeSingle(),
    supabase.from("chats").select("id, title, updated_at").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(30),
    supabase.from("workspace_files").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);
  if (!ws) return null;
  const kit = (ws.brand_kit ?? {}) as Record<string, string | undefined>;
  return {
    id: ws.id as string,
    name: ws.name as string,
    chats: (chats ?? []) as ProjectHomeData["chats"],
    fileCount: count ?? 0,
    logoId: kit.logo_id ?? null,
    colors: [kit.color_primary, kit.color_secondary].filter((c): c is string => Boolean(c && /^#[0-9a-fA-F]{6}$/.test(c))),
    brandFilled: Object.values(kit).some((v) => typeof v === "string" && v.trim()),
  };
}

export default async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; prompt?: string; research?: string }>;
}) {
  const { workspace, prompt, research } = await searchParams;
  const id = crypto.randomUUID();
  const workspaceId = workspace && /^[0-9a-f-]{36}$/i.test(workspace) ? workspace : null;
  const project = workspaceId ? await loadProject(workspaceId) : null;
  return (
    <ChatView
      key={id}
      chatId={id}
      initialMessages={[]}
      initialTier="auto"
      initialWorkspaceId={workspaceId}
      isNew
      tiers={publicTiers()}
      agent={null}
      initialCanvasIds={[]}
      initialShareToken={null}
      project={project}
      initialPrompt={typeof prompt === "string" ? prompt.slice(0, 4000) : null}
      initialResearch={research === "1"}
    />
  );
}
