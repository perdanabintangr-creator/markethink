"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Download,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  PanelRight,
  Pencil,
  Presentation,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { FileUIPart, SourceUrlUIPart } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/components/app/app-context";
import { getTiers } from "@/lib/ai/models.config";
import type { MtMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isTransparent, textBlocks } from "@/lib/message-text";
import { parseQuotedMessage } from "@/lib/quote";
import { Markdown } from "./markdown";
import { SelectionAsk } from "./selection-ask";

const TIER_LABEL = Object.fromEntries(getTiers({}).map((t) => [t.id, t.label]));
const NEGATIVE_REASONS = ["Tidak akurat", "Terlalu umum", "Tidak sesuai brand", "Format berantakan", "Bahasa kurang pas", "Lainnya"];

export function messageToText(m: MtMessage) {
  return textBlocks(m.parts).join("\n\n");
}

interface ToolPart {
  type: string;
  toolCallId?: string;
  state?: "input-streaming" | "input-available" | "output-available" | "output-error";
  output?: Record<string, unknown> & { ok?: boolean; error?: string };
}

type Block = { kind: "text"; text: string } | { kind: "tool"; part: ToolPart };
const RENDERED_TOOLS = new Set(["tool-generate_image", "tool-create_presentation"]);

/** Urutan tampilan jawaban: teks (potongan bersebelahan digabung) diselingi hasil gambar/PPT. */
function assistantBlocks(m: MtMessage): Block[] {
  const blocks: Block[] = [];
  let open = false;
  for (const p of m.parts) {
    if (p.type === "text") {
      const last = blocks[blocks.length - 1];
      if (open && last?.kind === "text") last.text += p.text;
      else blocks.push({ kind: "text", text: p.text });
      open = true;
    } else if (!isTransparent(p.type)) {
      open = false;
      if (RENDERED_TOOLS.has(p.type)) blocks.push({ kind: "tool", part: p as unknown as ToolPart });
    }
  }
  return blocks.filter((b) => b.kind === "tool" || b.text.trim());
}

function linkCitations(text: string, sources: SourceUrlUIPart[]) {
  if (!sources.length) return text;
  const byId = new Map(sources.map((s, i) => [String(i + 1), s.url]));
  return text.replace(/\[(\d{1,2})\](?!\()/g, (m, n: string) => (byId.has(n) ? `[[${n}]](${byId.get(n)})` : m));
}

export function ChatMessage({
  message,
  chatId,
  isLast,
  isStreaming,
  onRegenerate,
  onEdit,
  onOpenCanvas,
  onQuote,
  onExplain,
  statusLabel,
}: {
  message: MtMessage;
  chatId: string;
  isLast: boolean;
  isStreaming: boolean;
  onRegenerate?: () => void;
  onEdit?: (text: string) => void;
  onOpenCanvas?: (content: string) => void;
  /** Blok teks di jawaban → kutip ke kotak chat untuk ditanyakan. */
  onQuote?: (text: string) => void;
  /** Blok teks di jawaban → langsung minta penjelasan. */
  onExplain?: (text: string) => void;
  statusLabel?: string | null;
}) {
  const { t } = useApp();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [comment, setComment] = useState("");

  const text = messageToText(message);
  // Sumber unik per URL, dinomori berurutan [1], [2], ... (riset Tavily maupun pencarian web Claude).
  const sources = message.parts
    .filter((p): p is SourceUrlUIPart => p.type === "source-url")
    .filter((s, i, all) => all.findIndex((x) => x.url === s.url) === i);
  const files = message.parts.filter((p): p is FileUIPart => p.type === "file");
  const blocks = assistantBlocks(message);
  const lastPart = message.parts[message.parts.length - 1];
  const searching = lastPart?.type === "tool-web_search" || (message.parts.some((p) => p.type === "tool-web_search") && !text);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function sendFeedback(value: 1 | -1, reason?: string) {
    setRating(value);
    await fetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ chatId, messageId: message.id, rating: value, reason, comment: comment || undefined }),
    });
    toast.success(t.feedbackThanks);
  }

  if (message.role === "user") {
    return (
      <div className="group flex flex-col items-end gap-1">
        {files.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2 py-1 text-xs">
                {f.mediaType.startsWith("image/") ? <ImageIcon className="size-3.5" /> : <FileText className="size-3.5" />}
                {f.filename ?? "file"}
              </span>
            ))}
          </div>
        )}
        {editing ? (
          <div className="w-full max-w-[85%] space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} autoFocus />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t.cancel}</Button>
              <Button
                size="sm"
                disabled={!draft.trim()}
                onClick={() => {
                  setEditing(false);
                  onEdit?.(draft.trim());
                }}
              >
                {t.send}
              </Button>
            </div>
          </div>
        ) : (
          text && <UserBubble text={text} />
        )}
        {!editing && !isStreaming && onEdit && (
          <div className="flex gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
            <IconBtn label={t.copy} onClick={copy}>{copied ? <Check /> : <Copy />}</IconBtn>
            <IconBtn
              label={t.edit}
              onClick={() => {
                setDraft(text);
                setEditing(true);
              }}
            >
              <Pencil />
            </IconBtn>
          </div>
        )}
      </div>
    );
  }

  const showActions = !(isLast && isStreaming) && text;
  return (
    <div className="group space-y-2">
      {sources.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Globe className="size-3.5" /> {t.sources}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sources.map((s, i) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="w-48 shrink-0 rounded-lg border bg-card p-2 text-xs hover:bg-accent"
              >
                <span className="mr-1 inline-flex size-4 items-center justify-center rounded bg-primary/15 text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="line-clamp-2">{s.title ?? s.url}</span>
                <span className="mt-1 block truncate text-muted-foreground">{safeHost(s.url)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {(statusLabel || searching) && isLast && isStreaming && !text && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {searching ? t.searching : statusLabel}
        </p>
      )}

      <MaybeSelectionAsk enabled={!(isLast && isStreaming)} onQuote={onQuote} onExplain={onExplain}>
        {blocks.map((b, i) =>
          b.kind === "text" ? (
            <Markdown key={i}>{linkCitations(b.text, sources)}</Markdown>
          ) : b.part.type === "tool-generate_image" ? (
            <ImageResult key={b.part.toolCallId ?? i} part={b.part} streaming={isLast && isStreaming} />
          ) : (
            <DeckResult key={b.part.toolCallId ?? i} part={b.part} streaming={isLast && isStreaming} />
          ),
        )}
      </MaybeSelectionAsk>

      {showActions && (
        <div className="flex flex-wrap items-center gap-0.5 text-muted-foreground">
          <IconBtn label={t.copy} onClick={copy}>{copied ? <Check /> : <Copy />}</IconBtn>
          {isLast && onRegenerate && (
            <IconBtn label={t.regenerate} onClick={onRegenerate}>
              <RefreshCw />
            </IconBtn>
          )}
          <IconBtn label="Bagus" onClick={() => sendFeedback(1)} active={rating === 1}>
            <ThumbsUp />
          </IconBtn>
          <IconBtn label="Kurang bagus" onClick={() => setReasonOpen(true)} active={rating === -1}>
            <ThumbsDown />
          </IconBtn>
          {onOpenCanvas && (
            <Button variant="ghost" size="sm" className="ml-1 h-7 text-xs" onClick={() => onOpenCanvas(text)}>
              <PanelRight /> {t.openCanvas}
            </Button>
          )}
          {message.metadata?.tier && (
            <span className="ml-auto text-[11px]">
              {TIER_LABEL[message.metadata.tier]}
              {message.metadata.credits ? ` · ${message.metadata.credits} ${t.credits}` : ""}
            </span>
          )}
        </div>
      )}

      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apa yang kurang?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {NEGATIVE_REASONS.map((r) => (
              <Button
                key={r}
                variant="outline"
                size="sm"
                onClick={() => {
                  setReasonOpen(false);
                  void sendFeedback(-1, r);
                }}
              >
                {r}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder="Detail tambahan (opsional) — tulis sebelum memilih alasan"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MaybeSelectionAsk({
  enabled,
  onQuote,
  onExplain,
  children,
}: {
  enabled: boolean;
  onQuote?: (text: string) => void;
  onExplain?: (text: string) => void;
  children: React.ReactNode;
}) {
  if (!enabled || !onQuote || !onExplain) return <div className="space-y-2">{children}</div>;
  return (
    <SelectionAsk onAsk={onQuote} onExplain={onExplain}>
      <div className="space-y-2">{children}</div>
    </SelectionAsk>
  );
}

function UserBubble({ text }: { text: string }) {
  const { quote, body } = parseQuotedMessage(text);
  return (
    <div className="max-w-[85%] space-y-2 rounded-2xl rounded-br-md bg-primary/10 px-4 py-2.5 text-sm">
      {quote && (
        <p className="line-clamp-4 whitespace-pre-wrap border-l-2 border-primary/50 pl-2.5 text-xs text-muted-foreground">
          {quote}
        </p>
      )}
      {body && <p className="whitespace-pre-wrap">{body}</p>}
    </div>
  );
}

function ToolPending({ label, streaming }: { label: string; streaming: boolean }) {
  if (!streaming) return null;
  return (
    <p className="flex items-center gap-2 rounded-xl border border-dashed bg-card/50 px-4 py-3 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </p>
  );
}

function ToolError({ message }: { message: string }) {
  return <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{message}</p>;
}

function ImageResult({ part, streaming }: { part: ToolPart; streaming: boolean }) {
  const { t } = useApp();
  const [broken, setBroken] = useState(false);
  if (part.state === "output-error") return <ToolError message="Gagal membuat gambar." />;
  if (part.state !== "output-available" || !part.output) return <ToolPending label={t.generatingImage} streaming={streaming} />;
  if (!part.output.ok) return <ToolError message={part.output.error ?? "Gagal membuat gambar."} />;
  const url = String(part.output.url);
  return (
    <figure className="w-fit max-w-full space-y-1.5">
      {broken ? (
        <p className="rounded-xl border px-4 py-3 text-sm text-muted-foreground">{t.imageUnavailable}</p>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- file privat lewat signed URL */}
          <img
            src={url}
            alt={String(part.output.prompt ?? "Gambar buatan AI")}
            className="max-h-[520px] max-w-full rounded-xl border bg-muted object-contain"
            onError={() => setBroken(true)}
          />
        </a>
      )}
      <a href={`${url}?download=1`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <Download className="size-3.5" /> {t.download}
      </a>
    </figure>
  );
}

function DeckResult({ part, streaming }: { part: ToolPart; streaming: boolean }) {
  const { t } = useApp();
  if (part.state === "output-error") return <ToolError message="Gagal membuat presentasi." />;
  if (part.state !== "output-available" || !part.output) return <ToolPending label={t.buildingDeck} streaming={streaming} />;
  if (!part.output.ok) return <ToolError message={part.output.error ?? "Gagal membuat presentasi."} />;
  const titles = (part.output.slideTitles as string[] | undefined) ?? [];
  return (
    <div className="max-w-xl overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-3 border-b bg-gradient-to-r from-primary/15 to-transparent px-4 py-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Presentation className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{String(part.output.title)}</p>
          <p className="text-xs text-muted-foreground">
            PowerPoint · {Number(part.output.slideCount)} {t.slides}
          </p>
        </div>
        <Button asChild size="sm">
          <a href={`${String(part.output.url)}?download=1`}>
            <Download /> {t.downloadPptx}
          </a>
        </Button>
      </div>
      <ol className="max-h-56 space-y-1 overflow-y-auto px-4 py-3 text-xs text-muted-foreground">
        {titles.map((title, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-5 shrink-0 text-right font-medium text-foreground/70">{i + 1}</span>
            <span className="truncate">{title}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn("rounded-md p-1.5 hover:bg-accent hover:text-foreground [&_svg]:size-4", active && "text-primary")}
    >
      {children}
    </button>
  );
}
