"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  PanelRight,
  Pencil,
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
import { Markdown } from "./markdown";

const TIER_LABEL = Object.fromEntries(getTiers({}).map((t) => [t.id, t.label]));
const NEGATIVE_REASONS = ["Tidak akurat", "Terlalu umum", "Tidak sesuai brand", "Format berantakan", "Bahasa kurang pas", "Lainnya"];

export function messageToText(m: MtMessage) {
  return m.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("\n\n");
}

function linkCitations(text: string, sources: SourceUrlUIPart[]) {
  if (!sources.length) return text;
  const byId = new Map(sources.map((s) => [s.sourceId, s.url]));
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
  statusLabel,
}: {
  message: MtMessage;
  chatId: string;
  isLast: boolean;
  isStreaming: boolean;
  onRegenerate?: () => void;
  onEdit?: (text: string) => void;
  onOpenCanvas?: (content: string) => void;
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
  const sources = message.parts.filter((p): p is SourceUrlUIPart => p.type === "source-url");
  const files = message.parts.filter((p): p is FileUIPart => p.type === "file");
  const searching = message.parts.some((p) => p.type.startsWith("tool-")) && !text;

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
          text && (
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary/10 px-4 py-2.5 text-sm">
              {text}
            </div>
          )
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
            {sources.map((s) => (
              <a
                key={s.sourceId}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="w-48 shrink-0 rounded-lg border bg-card p-2 text-xs hover:bg-accent"
              >
                <span className="mr-1 inline-flex size-4 items-center justify-center rounded bg-primary/15 text-[10px] font-semibold text-primary">
                  {s.sourceId}
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

      {text ? <Markdown>{linkCitations(text, sources)}</Markdown> : null}

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
