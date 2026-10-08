"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { ArrowDown, Bot, Briefcase, Check, ChevronDown, FileText, Link2, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/components/app/app-context";
import { CanvasPanel } from "@/components/canvas/canvas-panel";
import { emitChatsChanged, emitCredits } from "@/lib/events";
import { track } from "@/lib/analytics";
import type { TierId } from "@/lib/ai/models.config";
import { ATTACHMENT_URL_PREFIX, PENDING_KEY, type MtMessage, type PendingAgentRun } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChatMessage, messageToText } from "./message";
import { Composer, type PendingAttachment } from "./composer";
import { ModelSelector, type TierOption } from "./model-selector";
import { QuotaDialog } from "./quota-dialog";


const SUGGESTIONS = [
  "Buatkan campaign plan 1 bulan untuk launching kopi susu literan di Jakarta",
  "Analisis tren marketing TikTok Shop untuk UMKM fashion tahun ini",
  "Tulis 5 caption Instagram untuk promo 12.12 brand skincare lokal",
  "Bantu saya bikin buyer persona untuk aplikasi belajar bahasa Inggris",
];

export function ChatView({
  chatId,
  initialMessages,
  initialTier,
  initialWorkspaceId,
  isNew,
  tiers,
  agent,
  initialCanvasIds,
  initialShareToken,
}: {
  chatId: string;
  initialMessages: MtMessage[];
  initialTier: TierId;
  initialWorkspaceId: string | null;
  isNew: boolean;
  tiers: TierOption[];
  agent: { id: string; name: string; output_canvas: boolean } | null;
  initialCanvasIds: string[];
  initialShareToken: string | null;
}) {
  const { t, workspaces } = useApp();
  const [tier, setTier] = useState<TierId>(initialTier);
  const [research, setResearch] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(initialWorkspaceId);
  const [activeAgent, setActiveAgent] = useState(agent);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [canvasIds, setCanvasIds] = useState(initialCanvasIds);
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [persisted, setPersisted] = useState(!isNew);
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoCanvasDone = useRef(initialCanvasIds.length > 0);

  const opts = useRef({ tier, research, workspaceId, agentId: agent?.id ?? null });
  opts.current = { tier, research, workspaceId, agentId: activeAgent?.id ?? null };

  const transport = useMemo(
    () =>
      new DefaultChatTransport<MtMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id }) => ({ body: { id, messages, ...opts.current } }),
      }),
    [],
  );

  const createCanvas = useCallback(
    async (content: string) => {
      const res = await fetch("/api/canvas", { method: "POST", body: JSON.stringify({ chatId, content }) });
      if (!res.ok) return toast.error("Gagal membuka canvas");
      const { id } = await res.json();
      setCanvasIds((ids) => [id, ...ids]);
      setCanvasId(id);
      track("canvas_opened");
    },
    [chatId],
  );

  const { messages, sendMessage, status, stop, regenerate, setMessages, error, clearError } = useChat<MtMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    onData: (part) => {
      if (part.type === "data-status") setStatusLabel(part.data.state === "done" ? null : part.data.label);
    },
    onFinish: ({ message }) => {
      setStatusLabel(null);
      setPersisted(true);
      if (typeof message.metadata?.remainingCredits === "number") emitCredits(message.metadata.remainingCredits);
      emitChatsChanged();
      setTimeout(emitChatsChanged, 4000);
      const text = messageToText(message);
      if (activeAgent?.output_canvas && !autoCanvasDone.current && text.length > 400) {
        autoCanvasDone.current = true;
        void createCanvas(text);
      }
    },
    onError: async (err) => {
      setStatusLabel(null);
      let code = "";
      try {
        code = JSON.parse(err.message).error;
      } catch {}
      if (code === "quota_exceeded") {
        setMessages((ms) => (ms[ms.length - 1]?.role === "user" ? ms.slice(0, -1) : ms));
        setQuotaOpen(true);
        track("quota_exceeded");
      } else if (code === "rate_limited") toast.error("Terlalu banyak permintaan. Tunggu sebentar ya.");
      const res = await fetch("/api/credits");
      if (res.ok) emitCredits((await res.json()).remaining);
    },
  });

  const busy = status === "submitted" || status === "streaming";

  const send = useCallback(
    (text: string, attachments: PendingAttachment[] = []) => {
      clearError();
      if (!persisted) window.history.replaceState(null, "", `/chat/${chatId}`);
      void sendMessage({
        text,
        files: attachments.map((a) => ({
          type: "file" as const,
          mediaType: a.mime,
          filename: a.name,
          url: `${ATTACHMENT_URL_PREFIX}${a.id}`,
        })),
      });
      track("message_sent", { tier: opts.current.tier, research: opts.current.research, attachments: attachments.length });
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    },
    [chatId, clearError, persisted, sendMessage],
  );

  // Jalankan agent yang dikirim dari halaman /agents.
  useEffect(() => {
    if (!isNew) return;
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_KEY);
    try {
      const run = JSON.parse(raw) as PendingAgentRun;
      setActiveAgent({ id: run.agentId, name: run.agentName, output_canvas: run.outputCanvas });
      setTier(run.tier);
      if (run.workspaceId) setWorkspaceId(run.workspaceId);
      opts.current = { ...opts.current, tier: run.tier, agentId: run.agentId, workspaceId: run.workspaceId ?? opts.current.workspaceId };
      send(run.text);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll saat streaming bila user di bawah.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottom) el.scrollTop = el.scrollHeight;
  }, [messages, atBottom]);

  async function changeWorkspace(id: string | null) {
    setWorkspaceId(id);
    if (persisted) {
      await fetch(`/api/chats/${chatId}`, { method: "PATCH", body: JSON.stringify({ workspace_id: id }) });
      emitChatsChanged();
    }
  }

  async function share() {
    if (!persisted) return toast.error("Kirim pesan dulu sebelum membagikan chat.");
    const res = await fetch(`/api/chats/${chatId}/share`, { method: "POST" });
    if (!res.ok) return toast.error("Gagal membuat link");
    const { token } = await res.json();
    setShareToken(token);
    await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    toast.success("Link publik (read-only) disalin ke clipboard");
    track("chat_shared");
  }

  async function unshare() {
    await fetch(`/api/chats/${chatId}/share`, { method: "DELETE" });
    setShareToken(null);
    toast.success("Link publik dimatikan");
  }

  function editMessage(index: number, text: string) {
    setMessages(messages.slice(0, index));
    send(text);
  }

  const workspaceName = workspaces.find((w) => w.id === workspaceId)?.name;
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");

  return (
    <div className="flex h-full">
      <div className={cn("flex h-full min-w-0 flex-1 flex-col", canvasId && "hidden lg:flex")}>
        <header className="flex items-center gap-1 border-b px-2 py-1.5 sm:px-3">
          <ModelSelector tiers={tiers} value={tier} onChange={setTier} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex max-w-40 items-center gap-1 truncate rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent sm:max-w-56">
                <Briefcase className="size-3.5 shrink-0" />
                <span className="truncate">{workspaceName ?? t.noWorkspace}</span>
                <ChevronDown className="size-3.5 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>{t.workspace}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => changeWorkspace(null)}>
                {!workspaceId ? <Check /> : <span className="size-4" />} {t.noWorkspace}
              </DropdownMenuItem>
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.id} onClick={() => changeWorkspace(w.id)}>
                  {workspaceId === w.id ? <Check /> : <span className="size-4" />} {w.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/workspaces">+ Kelola workspace</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          {canvasIds.length > 0 && !canvasId && (
            <Button variant="ghost" size="sm" onClick={() => setCanvasId(canvasIds[0])}>
              <FileText /> <span className="hidden sm:inline">Canvas</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.share}>
                <Share2 />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={share}>
                <Link2 /> {shareToken ? "Salin link publik" : "Buat link publik (read-only)"}
              </DropdownMenuItem>
              {shareToken && (
                <DropdownMenuItem onClick={unshare}>
                  <X /> Matikan link publik
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
          }}
          className="relative min-h-0 flex-1 overflow-y-auto"
        >
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 text-center">
              <h1 className="text-2xl font-semibold sm:text-3xl">{activeAgent ? activeAgent.name : t.emptyTitle}</h1>
              <p className="mt-2 text-muted-foreground">{t.emptySubtitle}</p>
              <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border bg-card p-3 text-left text-sm hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button asChild variant="link" className="mt-4">
                <Link href="/agents">
                  <Bot /> Lihat semua Marketing Agents
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
              {activeAgent && (
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Bot className="size-3.5" /> Agent: {activeAgent.name}
                </p>
              )}
              {messages.map((m, i) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  chatId={chatId}
                  isLast={i === messages.length - 1}
                  isStreaming={busy}
                  statusLabel={statusLabel ?? (status === "submitted" ? t.thinking : null)}
                  onRegenerate={i === lastAssistantIndex && !busy ? () => regenerate() : undefined}
                  onEdit={m.role === "user" ? (text) => editMessage(i, text) : undefined}
                  onOpenCanvas={m.role === "assistant" ? createCanvas : undefined}
                />
              ))}
              {status === "submitted" && messages[messages.length - 1]?.role === "user" && (
                <p className="animate-pulse text-sm text-muted-foreground">{statusLabel ?? t.thinking}</p>
              )}
              {error && !quotaOpen && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  Terjadi kendala saat menghubungi otak marketing.{" "}
                  <button className="font-medium underline" onClick={() => regenerate()}>
                    Coba lagi
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4">
          {!atBottom && messages.length > 0 && (
            <button
              onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
              className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full border bg-background p-2 shadow"
              aria-label="Scroll ke bawah"
            >
              <ArrowDown className="size-4" />
            </button>
          )}
          <Composer
            onSend={send}
            onStop={stop}
            busy={busy}
            research={research}
            onResearchChange={setResearch}
          />
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">{t.disclaimer}</p>
        </div>
      </div>

      {canvasId && (
        <div className="h-full w-full border-l lg:w-1/2 lg:max-w-3xl">
          <CanvasPanel key={canvasId} canvasId={canvasId} onClose={() => setCanvasId(null)} />
        </div>
      )}

      <QuotaDialog open={quotaOpen} onOpenChange={setQuotaOpen} />
    </div>
  );
}
