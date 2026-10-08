import { notFound } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { requireUser } from "@/lib/auth";
import { isTier, publicTiers } from "@/lib/tiers-public";
import type { MtMessage } from "@/lib/types";

export const metadata = { title: "Chat" };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireUser();
  const { data: chat } = await supabase
    .from("chats")
    .select("id, tier, workspace_id, share_token, agent:agents(id, name, output_canvas)")
    .eq("id", id)
    .maybeSingle();
  if (!chat) notFound();
  const [{ data: rows }, { data: canvases }] = await Promise.all([
    supabase.from("messages").select("id, role, parts, metadata").eq("chat_id", id).order("position"),
    supabase.from("canvases").select("id").eq("chat_id", id).order("updated_at", { ascending: false }),
  ]);
  const messages = (rows ?? []).map((r) => ({
    id: r.id,
    role: r.role,
    parts: r.parts,
    metadata: r.metadata ?? undefined,
  })) as MtMessage[];
  const agent = (Array.isArray(chat.agent) ? chat.agent[0] : chat.agent) as
    | { id: string; name: string; output_canvas: boolean }
    | null;

  return (
    <ChatView
      key={id}
      chatId={id}
      initialMessages={messages}
      initialTier={isTier(chat.tier) ? chat.tier : "senior"}
      initialWorkspaceId={chat.workspace_id}
      isNew={false}
      tiers={publicTiers()}
      agent={agent ?? null}
      initialCanvasIds={(canvases ?? []).map((c) => c.id)}
      initialShareToken={chat.share_token}
    />
  );
}
