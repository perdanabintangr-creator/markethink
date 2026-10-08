import { ChatView } from "@/components/chat/chat-view";
import { publicTiers } from "@/lib/tiers-public";

export const metadata = { title: "Chat" };

export default async function NewChatPage({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const { workspace } = await searchParams;
  const id = crypto.randomUUID();
  return (
    <ChatView
      key={id}
      chatId={id}
      initialMessages={[]}
      initialTier="senior"
      initialWorkspaceId={workspace && /^[0-9a-f-]{36}$/i.test(workspace) ? workspace : null}
      isNew
      tiers={publicTiers()}
      agent={null}
      initialCanvasIds={[]}
      initialShareToken={null}
    />
  );
}
