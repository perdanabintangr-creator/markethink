"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { ArrowDown, Bot, Briefcase, Check, ChevronDown, FileText, FolderOpen, Link2, Loader2, PanelRight, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pickTier, pickTierChoice, useApp } from "@/components/app/app-context";
import type { TierChoice } from "@/lib/ai/auto-tier";
import { CanvasPanel } from "@/components/canvas/canvas-panel";
import { ToolRunPanel } from "@/components/tools/tool-run-panel";
import { UPDATE_RESULT_BLOCK } from "@/lib/addons/format";
import { readToolTierPref } from "@/lib/addons/tool-tier";
import { emitChatsChanged, emitCredits } from "@/lib/events";
import { track } from "@/lib/analytics";
import { ATTACHMENT_URL_PREFIX, PENDING_KEY, isGenerating, type MtMessage, type PendingAgentRun } from "@/lib/types";
import { cn } from "@/lib/utils";
import { chatText } from "@/lib/i18n/chat";
import { ChatMessage, messageToText } from "./message";
import { buildQuotedMessage } from "@/lib/quote";
import { Composer, type PendingAttachment } from "./composer";
import { ModelSelector, type TierOption } from "./model-selector";
import { ProjectHome, type ProjectHomeData } from "./project-home";
import { QuickStarts, type QuickStart } from "./quick-starts";
import { QuotaDialog } from "./quota-dialog";



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
  toolRun = null,
  initialGenerating = false,
  project = null,
}: {
  chatId: string;
  initialMessages: MtMessage[];
  /** Pilihan otak tersimpan ("auto" = Otak Otomatis). */
  initialTier: string;
  initialWorkspaceId: string | null;
  isNew: boolean;
  tiers: TierOption[];
  agent: { id: string; name: string; output_canvas: boolean } | null;
  initialCanvasIds: string[];
  initialShareToken: string | null;
  /** Chat dari "Bahas di Chat": hasil Tools Pro tampil di panel kanan & bisa diperbarui lewat percakapan. */
  toolRun?: { rootId: string; tool: string } | null;
  /** Chat dibuka saat AI masih menjawab (mis. user sempat pindah chat) → jawaban dimuat otomatis begitu selesai. */
  initialGenerating?: boolean;
  /** Chat baru dibuka dari sebuah project → tampil halaman depan project (seperti ChatGPT/Claude Projects). */
  project?: ProjectHomeData | null;
}) {
  const { t, lang, user, workspaces, allowedTiers, personaRole } = useApp();
  const c = chatText(lang);
  const [tier, setTier] = useState<TierChoice>(() => pickTierChoice(initialTier, allowedTiers));
  const [lockedTier, setLockedTier] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [quote, setQuote] = useState<string | null>(null);
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
  const [runOpen, setRunOpen] = useState(false);
  const [runRefresh, setRunRefresh] = useState(0);
  const [runUpdating, setRunUpdating] = useState<{ since: number } | null>(null);
  const latestRunId = useRef<string | null>(toolRun?.rootId ?? null);
  // Panel hasil otomatis terbuka di layar lebar.
  useEffect(() => {
    if (toolRun && window.innerWidth >= 1024) setRunOpen(true);
  }, [toolRun]);

  const updateToolRun = useCallback(
    async (note: string) => {
      if (!toolRun || !note.trim()) return;
      setRunOpen(true);
      setRunUpdating({ since: Date.now() });
      try {
        const res = await fetch(`/api/tools/${toolRun.tool}`, {
          method: "POST",
          body: JSON.stringify({ __revise: { runId: latestRunId.current ?? toolRun.rootId, note }, __tier: readToolTierPref() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return void toast.error(data.message ?? c.toolRunUpdateFailed);
        latestRunId.current = data.runId;
        setRunRefresh((n) => n + 1);
        toast.success(c.toolRunUpdated);
        emitChatsChanged();
      } catch {
        toast.error(c.toolRunUpdateOffline);
      } finally {
        setRunUpdating(null);
      }
    },
    [toolRun, c],
  );

  /** Tombol "Perbarui hasil" di bawah jawaban: jadikan pembahasan itu arahan revisi. */
  const applyToResult = useCallback(
    (question: MtMessage | undefined, answer: string) => {
      const q = question?.role === "user" ? messageToText(question).trim().slice(0, 500) : "";
      const note = [
        "Terapkan hasil pembahasan di chat berikut ke hasil ini (ubah bagian yang terdampak, pertahankan sisanya).",
        q && `Permintaan user: ${q}`,
        `Jawaban yang disetujui user:\n${answer.trim()}`,
      ]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 3000);
      void updateToolRun(note);
    },
    [updateToolRun],
  );

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
      if (!res.ok) return toast.error(c.canvasFailed);
      const { id } = await res.json();
      setCanvasIds((ids) => [id, ...ids]);
      setCanvasId(id);
      track("canvas_opened");
    },
    [chatId, c],
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
      const update = toolRun ? text.match(UPDATE_RESULT_BLOCK) : null;
      if (update) void updateToolRun(update[1].trim());
      if (activeAgent?.output_canvas && !autoCanvasDone.current && text.length > 400) {
        autoCanvasDone.current = true;
        void createCanvas(text);
      }
    },
    onError: async (err) => {
      setStatusLabel(null);
      let code = "";
      let serverMessage = "";
      try {
        const body = JSON.parse(err.message);
        code = body.error;
        serverMessage = body.message ?? "";
      } catch {}
      if (code === "daily_limit") {
        setMessages((ms) => (ms[ms.length - 1]?.role === "user" ? ms.slice(0, -1) : ms));
        setLockedTier(null);
        setLimitNotice(serverMessage || c.dailyLimitDefault);
        setQuotaOpen(true);
        track("daily_limit");
      } else if (code === "quota_exceeded") {
        setLimitNotice(null);
        setMessages((ms) => (ms[ms.length - 1]?.role === "user" ? ms.slice(0, -1) : ms));
        setQuotaOpen(true);
        track("quota_exceeded");
      } else if (code === "rate_limited") toast.error(c.rateLimited);
      else if (code === "tier_locked") {
        setMessages((ms) => (ms[ms.length - 1]?.role === "user" ? ms.slice(0, -1) : ms));
        setTier(pickTierChoice(null, allowedTiers));
        setLimitNotice(null);
        setLockedTier(`${c.thisBrain}|pro`);
        setQuotaOpen(true);
      } else if (code === "server_not_configured") toast.error(c.serverNotConfigured);
      const res = await fetch("/api/credits");
      if (res.ok) emitCredits((await res.json()).remaining);
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // Stop: hentikan tampilan sekaligus minta server menghentikan AI (kuota hanya untuk yang sudah dibuat).
  const stopAll = useCallback(() => {
    void stop();
    setRemoteWaiting(false);
    setStatusLabel(null);
    void fetch("/api/chat/stop", { method: "POST", body: JSON.stringify({ id: chatId }) })
      .catch(() => {})
      .finally(() => emitChatsChanged());
  }, [stop, chatId]);

  // Riwayat sidebar langsung memuat chat ini (dengan ikon loading) begitu AI mulai menjawab.
  useEffect(() => {
    if (status === "streaming") emitChatsChanged();
  }, [status]);

  // Dibuka saat AI masih menjawab di server → tunggu & tampilkan jawabannya tanpa perlu refresh.
  const [remoteWaiting, setRemoteWaiting] = useState(
    initialGenerating && initialMessages[initialMessages.length - 1]?.role === "user",
  );
  useEffect(() => {
    if (!remoteWaiting) return;
    let stopped = false;
    const tick = async () => {
      const res = await fetch(`/api/chats/${chatId}`).catch(() => null);
      if (stopped || !res?.ok) return;
      const data = (await res.json()) as { generating_at: string | null; messages: MtMessage[] };
      if (!isGenerating(data.generating_at)) {
        setMessages(data.messages);
        setRemoteWaiting(false);
        emitChatsChanged();
      }
    };
    const timer = setInterval(() => void tick(), 3000);
    void tick();
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [remoteWaiting, chatId, setMessages]);

  const onLockedTier = (lt: TierOption) => {
    setLimitNotice(null);
    setLockedTier(`${lt.label}|${lt.minPlan}`);
    setQuotaOpen(true);
    track("tier_locked_clicked", { tier: lt.id });
  };

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
      run.tier = pickTier(run.tier, allowedTiers);
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
    if (!persisted) return toast.error(c.shareNeedsMessage);
    const res = await fetch(`/api/chats/${chatId}/share`, { method: "POST" });
    if (!res.ok) return toast.error(c.shareLinkFailed);
    const { token } = await res.json();
    setShareToken(token);
    await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    toast.success(c.shareLinkCopied);
    track("chat_shared");
  }

  async function unshare() {
    await fetch(`/api/chats/${chatId}/share`, { method: "DELETE" });
    setShareToken(null);
    toast.success(c.shareLinkDisabled);
  }

  function editMessage(index: number, text: string) {
    setMessages(messages.slice(0, index));
    send(text);
  }

  const workspaceName = workspaces.find((w) => w.id === workspaceId)?.name;
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");

  const [prefill, setPrefill] = useState<{ text: string; key: number } | null>(null);
  const firstName = (user.name ?? "").trim().split(/\s+/)[0] ?? "";
  const pickQuickStart = (q: QuickStart) => {
    if (q.research) setResearch(true);
    setPrefill({ text: q.prompt[lang], key: Date.now() });
  };
  const composer = (extra: { autoFocus?: boolean; placeholder?: string } = {}) => (
    <Composer
      onSend={(text, files) => {
        setPrefill(null);
        send(text, files);
      }}
      onStop={stopAll}
      busy={busy || remoteWaiting}
      research={research}
      onResearchChange={setResearch}
      brainSlot={<ModelSelector compact tiers={tiers} value={tier} onChange={setTier} onLocked={onLockedTier} />}
      quote={quote}
      onClearQuote={() => setQuote(null)}
      prefill={prefill}
      autoFocus={extra.autoFocus}
      placeholder={extra.placeholder}
    />
  );
  const disclaimer = <p className="mt-1.5 text-center text-[11px] text-muted-foreground">{t.disclaimer}</p>;

  return (
    <div className="flex h-full">
      <div className={cn("flex h-full min-w-0 flex-1 flex-col", (canvasId || (toolRun && runOpen)) && "hidden lg:flex")}>
        <header className="flex items-center gap-1 border-b px-2 py-1.5 sm:px-3">
          <ModelSelector tiers={tiers} value={tier} onChange={setTier} onLocked={onLockedTier} />
          {persisted || messages.length > 0 ? (
            // Chat yang sudah berjalan terkunci di project-nya agar isinya tidak bercampur dengan project lain.
            <span
              title={t.projectLocked}
              className="flex max-w-40 items-center gap-1 truncate rounded-lg px-2 py-1.5 text-xs text-muted-foreground sm:max-w-56"
            >
              {workspaceId ? <FolderOpen className="size-3.5 shrink-0 text-primary" /> : <Briefcase className="size-3.5 shrink-0" />}
              <span className="truncate">{workspaceName ?? t.noWorkspace}</span>
            </span>
          ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex max-w-40 items-center gap-1 truncate rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent sm:max-w-56">
                <FolderOpen className="size-3.5 shrink-0" />
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
                <Link href="/workspaces">{c.manageProjects}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
          <div className="flex-1" />
          {toolRun && !runOpen && (
            <Button variant="ghost" size="sm" onClick={() => setRunOpen(true)}>
              <PanelRight /> <span className="hidden sm:inline">{c.result}</span>
            </Button>
          )}
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
                <Link2 /> {shareToken ? c.copyPublicLink : c.createPublicLink}
              </DropdownMenuItem>
              {shareToken && (
                <DropdownMenuItem onClick={unshare}>
                  <X /> {c.disablePublicLink}
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
          {messages.length === 0 && project && project.id === workspaceId && !activeAgent ? (
            <ProjectHome
              project={project}
              composer={composer({ autoFocus: true, placeholder: c.newChatIn(project.name) })}
              extras={
                <div className="mt-3">
                  <QuickStarts
                    lang={lang}
                    onPick={pickQuickStart}
                    role={personaRole}
                    onTemplate={(tpl) => {
                      if (tpl.research) setResearch(true);
                      setPrefill({ text: tpl.prompt, key: Date.now() });
                    }}
                    compact
                  />
                  <div className="mt-2">{disclaimer}</div>
                </div>
              }
            />
          ) : messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-3 py-8 sm:px-4">
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {activeAgent ? activeAgent.name : firstName ? `${t.hello}, ${firstName}` : t.emptyTitle}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">{activeAgent ? t.agentReady : t.emptyTitle}</p>
              </div>
              {composer({ autoFocus: true })}
              {!activeAgent && (
                <div className="mt-4">
                  <QuickStarts
                    lang={lang}
                    onPick={pickQuickStart}
                    role={personaRole}
                    onTemplate={(tpl) => {
                      if (tpl.research) setResearch(true);
                      setPrefill({ text: tpl.prompt, key: Date.now() });
                    }}
                  />
                </div>
              )}
              <div className="mt-3">{disclaimer}</div>
            </div>
          ) : (
            <div className="chat-thread chat-col mx-auto max-w-3xl space-y-6 px-4 py-6">
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
                  onQuote={m.role === "assistant" ? setQuote : undefined}
                  onApplyToResult={
                    toolRun && m.role === "assistant" && !busy && !runUpdating && i > 0 && !UPDATE_RESULT_BLOCK.test(messageToText(m))
                      ? (text) => applyToResult(messages[i - 1], text)
                      : undefined
                  }
                  applyHighlight={i === lastAssistantIndex}
                  onExplain={
                    m.role === "assistant" && !busy ? (text) => send(buildQuotedMessage(text, t.explainPrompt)) : undefined
                  }
                />
              ))}
              {status === "submitted" && messages[messages.length - 1]?.role === "user" && (
                <p className="animate-pulse text-sm text-muted-foreground">{statusLabel ?? t.thinking}</p>
              )}
              {remoteWaiting && !busy && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" /> {c.remoteWaiting}
                </p>
              )}
              {error && !quotaOpen && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  {c.chatError}{" "}
                  <button className="font-medium underline" onClick={() => regenerate()}>
                    {c.retry}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {messages.length > 0 && (
        <div className="chat-col relative mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4">
          {!atBottom && (
            <button
              onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
              className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full border bg-background p-2 shadow"
              aria-label={c.scrollDown}
            >
              <ArrowDown className="size-4" />
            </button>
          )}
          {composer()}
          {disclaimer}
        </div>
        )}
      </div>

      {canvasId ? (
        <div className="h-full w-full border-l lg:w-1/2 lg:max-w-3xl">
          <CanvasPanel key={canvasId} canvasId={canvasId} onClose={() => setCanvasId(null)} />
        </div>
      ) : (
        toolRun &&
        runOpen && (
          <div className="h-full w-full border-l lg:w-1/2 lg:max-w-3xl">
            <ToolRunPanel
              rootId={toolRun.rootId}
              refreshKey={runRefresh}
              updating={runUpdating}
              onClose={() => setRunOpen(false)}
              onLoaded={(d) => (latestRunId.current = d.run.id)}
            />
          </div>
        )
      )}

      <QuotaDialog
        open={quotaOpen}
        onOpenChange={(v) => {
          setQuotaOpen(v);
          if (!v) {
            setLockedTier(null);
            setLimitNotice(null);
          }
        }}
        lockedTier={lockedTier}
        notice={limitNotice}
      />
    </div>
  );
}
