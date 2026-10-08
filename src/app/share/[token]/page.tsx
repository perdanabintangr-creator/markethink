import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Globe } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Markdown } from "@/components/chat/markdown";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Chat dibagikan", robots: { index: false, follow: false } };

interface Part {
  type: string;
  text?: string;
  url?: string;
  title?: string;
  sourceId?: string;
  filename?: string;
}

export default async function SharedChatPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();
  const admin = createAdminClient();
  const { data: chat } = await admin.from("chats").select("id, title, created_at").eq("share_token", token).maybeSingle();
  if (!chat) notFound();
  const { data: messages } = await admin
    .from("messages")
    .select("id, role, parts")
    .eq("chat_id", chat.id)
    .order("position");

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo />
          <Button asChild size="sm"><Link href="/register">Coba Markethink</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-xl font-bold">{chat.title}</h1>
          <p className="text-xs text-muted-foreground">Dibagikan read-only · {new Date(chat.created_at).toLocaleDateString("id-ID")}</p>
        </div>
        {(messages ?? []).map((m) => {
          const parts = (m.parts ?? []) as Part[];
          const text = parts.filter((p) => p.type === "text").map((p) => p.text).join("\n\n");
          const sources = parts.filter((p) => p.type === "source-url");
          const files = parts.filter((p) => p.type === "file");
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex flex-col items-end gap-1">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs">
                    <FileText className="size-3" /> {f.filename}
                  </span>
                ))}
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary/10 px-4 py-2.5 text-sm">{text}</div>
              </div>
            );
          }
          return (
            <div key={m.id} className="space-y-2">
              {sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Globe className="size-3.5 text-muted-foreground" />
                  {sources.map((s) => (
                    <a key={s.sourceId} href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="rounded border px-1.5 hover:bg-accent">
                      [{s.sourceId}] {s.title?.slice(0, 40)}
                    </a>
                  ))}
                </div>
              )}
              <Markdown>{text}</Markdown>
            </div>
          );
        })}
      </main>
    </div>
  );
}
