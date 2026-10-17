"use client";

import { UPDATE_RESULT_BLOCK } from "@/lib/addons/format";
import { useEffect, useState } from "react";
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
  Wand2,
  FolderOpen,
  Link2,
  Link2Off,
} from "lucide-react";
import type { FileUIPart, SourceUrlUIPart } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/components/app/app-context";
import { getTiers } from "@/lib/ai/models.config";
import type { LinkPart, MtMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isTransparent, textBlocks } from "@/lib/message-text";
import { parseQuotedMessage } from "@/lib/quote";
import { chatText, type ChatText } from "@/lib/i18n/chat";
import { Markdown } from "./markdown";
import { DeckPreviewButton, type DeckInput } from "./deck-preview";
import { ScenePreviewButton } from "./scene-preview";
import { SelectionAsk } from "./selection-ask";

const TIER_LABEL = Object.fromEntries(getTiers({}).map((t) => [t.id, t.label]));
/** Nilai alasan yang disimpan (selalu versi Indonesia); labelnya mengikuti bahasa UI. */
const NEGATIVE_REASONS = chatText("id").negativeReasons;

export function messageToText(m: MtMessage) {
  return textBlocks(m.parts).join("\n\n");
}

interface ToolPart {
  type: string;
  toolCallId?: string;
  state?: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: unknown;
  output?: Record<string, unknown> & { ok?: boolean; error?: string };
}

type Block = { kind: "text"; text: string } | { kind: "tool"; part: ToolPart };
const RENDERED_TOOLS = new Set([
  "tool-generate_image",
  "tool-create_presentation",
  "tool-read_tool_result",
  "tool-create_carousel",
  "tool-product_photo",
]);

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
  onApplyToResult,
  applyHighlight,
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
  /** Chat dari hasil Tools Pro: terapkan isi jawaban ini ke hasil (buat versi baru). */
  onApplyToResult?: (text: string) => void;
  /** Jawaban terakhir: tampilkan ajakan memperbarui hasil yang lebih menonjol. */
  applyHighlight?: boolean;
  statusLabel?: string | null;
}) {
  const { t, lang } = useApp();
  const c = chatText(lang);
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
  const links = message.parts.flatMap((p) => (p.type === "data-link" ? [p.data as LinkPart] : []));
  // Percobaan PPT yang gagal lalu berhasil diulang AI tidak perlu ditampilkan sebagai error.
  const allBlocks = assistantBlocks(message);
  const lastDeckOk = allBlocks.findLastIndex(
    (b) => b.kind === "tool" && b.part.type === "tool-create_presentation" && b.part.state === "output-available" && b.part.output?.ok,
  );
  const blocks = allBlocks.filter(
    (b, i) =>
      !(i < lastDeckOk && b.kind === "tool" && b.part.type === "tool-create_presentation" && (b.part.state === "output-error" || b.part.output?.ok === false)),
  );
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
  // Selama belum ada tulisan baru & tidak ada tool yang sedang tampil prosesnya → tampilkan indikator "sedang bekerja",
  // agar jeda berpikir (otak Director, PPT) tidak disangka error.
  const toolBusy = message.parts.some(
    (p) => p.type.startsWith("tool-") && ["input-streaming", "input-available"].includes((p as { state?: string }).state ?? ""),
  );
  const working = message.role === "assistant" && !toolBusy && !(lastPart?.type === "text" && lastPart.text.trim());
  // Jawaban selesai tapi kosong (model berhenti tanpa hasil) → beri tahu user, kuota sudah dikembalikan server.
  const emptyDone =
    message.role === "assistant" &&
    !(isLast && isStreaming) &&
    !text &&
    !message.parts.some((p) => p.type.startsWith("tool-") && (p as { state?: string }).state === "output-available" && (p as { output?: { ok?: boolean } }).output?.ok);
  return (
    <div className="group space-y-2">
      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {links.map((l) => (
            <LinkChip key={l.url} link={l} />
          ))}
        </div>
      )}
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

      {isLast && isStreaming && (searching || working) && <WorkingIndicator label={searching ? t.searching : statusLabel} fallback={t.thinking} />}

      {emptyDone && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          {c.emptyAnswer}
        </p>
      )}

      <MaybeSelectionAsk enabled={!(isLast && isStreaming)} onQuote={onQuote} onExplain={onExplain}>
        {blocks.map((b, i) =>
          b.kind === "text" ? (
            <Markdown key={i}>{linkCitations(hideUpdateBlock(b.text, c), sources)}</Markdown>
          ) : b.part.type === "tool-read_tool_result" ? (
            <ReadResultChip key={b.part.toolCallId ?? i} part={b.part} />
          ) : b.part.type === "tool-generate_image" ? (
            <ImageResult key={b.part.toolCallId ?? i} part={b.part} streaming={isLast && isStreaming} />
          ) : b.part.type === "tool-create_carousel" ? (
            <CarouselResult key={b.part.toolCallId ?? i} part={b.part} streaming={isLast && isStreaming} />
          ) : b.part.type === "tool-product_photo" ? (
            <ProductPhotoResult key={b.part.toolCallId ?? i} part={b.part} streaming={isLast && isStreaming} />
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
          <IconBtn label={c.good} onClick={() => sendFeedback(1)} active={rating === 1}>
            <ThumbsUp />
          </IconBtn>
          <IconBtn label={c.notGood} onClick={() => setReasonOpen(true)} active={rating === -1}>
            <ThumbsDown />
          </IconBtn>
          {onOpenCanvas && (
            <Button variant="ghost" size="sm" className="ml-1 h-7 text-xs" onClick={() => onOpenCanvas(text)}>
              <PanelRight /> {t.openCanvas}
            </Button>
          )}
          {onApplyToResult && !applyHighlight && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onApplyToResult(hideUpdateBlock(text, c))}>
              <RefreshCw /> {c.applyToResult}
            </Button>
          )}
          {message.metadata?.tier && (
            <span className="ml-auto text-[11px]">
              {TIER_LABEL[message.metadata.tier]}
            </span>
          )}
        </div>
      )}

      {showActions && onApplyToResult && applyHighlight && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
          <Wand2 className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 text-muted-foreground">{c.applyPrompt}</span>
          <Button size="sm" className="h-8" onClick={() => onApplyToResult(hideUpdateBlock(text, c))}>
            <RefreshCw /> {c.updateResult}
          </Button>
        </div>
      )}

      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{c.whatWasWrong}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {NEGATIVE_REASONS.map((r, i) => (
              <Button
                key={r}
                variant="outline"
                size="sm"
                onClick={() => {
                  setReasonOpen(false);
                  void sendFeedback(-1, r);
                }}
              >
                {c.negativeReasons[i] ?? r}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder={c.feedbackDetail}
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
    <div className="user-bubble max-w-[85%] space-y-2 rounded-2xl rounded-br-md bg-primary/10 px-4 py-2.5 text-sm">
      {quote && (
        <p className="line-clamp-4 whitespace-pre-wrap border-l-2 border-primary/50 pl-2.5 text-xs text-muted-foreground">
          {quote}
        </p>
      )}
      {body && <p className="whitespace-pre-wrap">{body}</p>}
    </div>
  );
}

/** Indikator proses dengan label yang berganti bila menunggu lama. */
function WorkingIndicator({ label, fallback }: { label?: string | null; fallback: string }) {
  const c = chatText(useApp().lang);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const text =
    label ?? (secs < 6 ? fallback : secs < 20 ? c.workingLong : c.workingLonger);
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary" />
      <span className="animate-pulse">{text}</span>
    </p>
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
  const { t, lang } = useApp();
  const c = chatText(lang);
  const [broken, setBroken] = useState(false);
  if (part.state === "output-error") return <ToolError message={c.imageFailed} />;
  if (part.state !== "output-available" || !part.output) return <ToolPending label={t.generatingImage} streaming={streaming} />;
  if (!part.output.ok) return <ToolError message={part.output.error ?? c.imageFailed} />;
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
            alt={String(part.output.prompt ?? c.imageAlt)}
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

/** Carousel / poster: deretan slide (JPEG siap posting), unduh ZIP & PDF, salin caption. */
function CarouselResult({ part, streaming }: { part: ToolPart; streaming: boolean }) {
  const { t, lang } = useApp();
  const c = chatText(lang);
  const [copiedCaption, setCopiedCaption] = useState(false);
  if (part.state === "output-error") return <ToolError message={c.carouselFailed} />;
  if (part.state !== "output-available" || !part.output)
    return <ToolPending label={part.state === "input-streaming" ? c.carouselWriting : c.carouselDesigning} streaming={streaming} />;
  if (!part.output.ok) return <ToolError message={part.output.error ?? c.carouselFailed} />;
  const o = part.output;
  const slides = (o.slides as string[] | undefined) ?? [];
  const format = String(o.format ?? "4:5");
  const ratio = format === "1:1" ? "1 / 1" : format === "9:16" ? "9 / 16" : "4 / 5";
  const caption = o.caption ? String(o.caption) : "";
  const single = slides.length === 1;
  return (
    <div className="max-w-xl overflow-hidden rounded-xl border bg-card">
      <div className="flex gap-2 overflow-x-auto bg-muted/40 p-3">
        {slides.map((src, i) => (
          <a key={src} href={`${src}?download=1`} title={c.downloadSlide(i + 1)} className="shrink-0" style={{ width: single ? 220 : 150 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- file pribadi via /api/attachments */}
            <img src={src} alt={c.slideAlt(i + 1)} loading="lazy" className="w-full rounded-md object-cover shadow-sm ring-1 ring-black/5" style={{ aspectRatio: ratio }} />
          </a>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{String(o.title)}</p>
          <p className="text-xs text-muted-foreground">
            {single ? c.poster : c.carouselMeta(slides.length)} · {format} · JPEG + PDF
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {o.sceneUrl ? (
            <ScenePreviewButton
              sceneUrl={String(o.sceneUrl)}
              images={o.previewImages as Record<string, string> | undefined}
              pdfUrl={o.pdfUrl ? String(o.pdfUrl) : undefined}
              pptxUrl={String(o.url)}
              kind="carousel"
              downloadLabel={c.downloadAllZip}
              title={String(o.title)}
            />
          ) : null}
          <Button asChild size="sm" variant="outline">
            <a href={`${String(o.pdfUrl)}?download=1`}>
              <FileText /> PDF
            </a>
          </Button>
          <Button asChild size="sm">
            <a href={`${single ? slides[0] : String(o.url)}?download=1`}>
              <Download /> {single ? c.downloadJpeg : c.downloadAll}
            </a>
          </Button>
        </div>
      </div>
      {caption && (
        <div className="border-t px-4 py-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">{c.captionReady}</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={async () => {
                await navigator.clipboard.writeText(caption);
                setCopiedCaption(true);
                setTimeout(() => setCopiedCaption(false), 1500);
              }}
            >
              {copiedCaption ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copiedCaption ? t.copied : t.copy}
            </button>
          </div>
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm">{caption}</p>
        </div>
      )}
    </div>
  );
}

/** Foto Produk Studio: hasil beberapa variasi foto katalog. */
function ProductPhotoResult({ part, streaming }: { part: ToolPart; streaming: boolean }) {
  const { t, lang } = useApp();
  const c = chatText(lang);
  if (part.state === "output-error") return <ToolError message={c.productPhotoFailed} />;
  if (part.state !== "output-available" || !part.output) return <ToolPending label={c.productPhotoPending} streaming={streaming} />;
  if (!part.output.ok) return <ToolError message={part.output.error ?? c.productPhotoFailed} />;
  const images = (part.output.images as { attachmentId: string; url: string }[] | undefined) ?? [];
  return (
    <div className="grid max-w-xl grid-cols-2 gap-2">
      {images.map((img, i) => (
        <figure key={img.attachmentId} className="space-y-1">
          <a href={img.url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- file pribadi via /api/attachments */}
            <img src={img.url} alt={c.productPhotoAlt(i + 1)} loading="lazy" className="w-full rounded-xl border bg-muted object-cover" />
          </a>
          <a href={`${img.url}?download=1`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Download className="size-3.5" /> {t.download}
          </a>
        </figure>
      ))}
    </div>
  );
}

function DeckResult({ part, streaming }: { part: ToolPart; streaming: boolean }) {
  const { t, lang } = useApp();
  const c = chatText(lang);
  if (part.state === "output-error") return <ToolError message={c.deckFailed} />;
  if (part.state !== "output-available" || !part.output)
    return <ToolPending label={part.state === "input-streaming" ? c.deckWriting : t.buildingDeck} streaming={streaming} />;
  if (!part.output.ok) return <ToolError message={part.output.error ?? c.deckFailed} />;
  const titles = (part.output.slideTitles as string[] | undefined) ?? [];
  const theme = DECK_THEMES[String(part.output.theme ?? "")] ?? DECK_THEMES.midnight;
  const images = Number(part.output.images ?? 0);
  // Signature: cover memakai foto KV asli.
  const cover = part.output.sceneUrl ? (part.output.previewImages as Record<string, string> | undefined)?.cover : undefined;
  return (
    <div className="max-w-xl overflow-hidden rounded-xl border bg-card">
      {/* Pratinjau cover sesuai tema deck */}
      <div className="relative aspect-[16/6] overflow-hidden px-6 py-5" style={{ background: theme.bg }}>
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- file pribadi via /api/attachments */}
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" aria-hidden />
          </>
        ) : (
          <>
            <div className="absolute -right-10 -top-16 size-48 rounded-full opacity-25" style={{ background: theme.accent }} aria-hidden />
            <div className="absolute -bottom-20 right-16 size-40 rounded-full opacity-20" style={{ background: theme.accent2 }} aria-hidden />
          </>
        )}
        <div className="relative h-1.5 w-10 rounded-full" style={{ background: theme.accent }} />
        <p className="relative mt-3 line-clamp-2 max-w-[75%] text-lg font-bold leading-snug" style={{ color: cover ? "#fff" : theme.text }}>
          {String(part.output.title)}
        </p>
        <p className="relative mt-1 text-[11px]" style={{ color: cover ? "rgba(255,255,255,.75)" : theme.muted }}>
          {Number(part.output.slideCount)} {t.slides}
          {images > 0 ? c.aiPhotos(images) : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b bg-gradient-to-r from-primary/15 to-transparent px-4 py-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Presentation className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{String(part.output.title)}</p>
          <p className="text-xs text-muted-foreground">
            {part.output.pdfUrl ? "Signature · PPT + PDF" : "PowerPoint"} · {Number(part.output.slideCount)} {t.slides}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {part.output.sceneUrl ? (
            <ScenePreviewButton
              sceneUrl={String(part.output.sceneUrl)}
              images={part.output.previewImages as Record<string, string> | undefined}
              pdfUrl={part.output.pdfUrl ? String(part.output.pdfUrl) : undefined}
              pptxUrl={String(part.output.editableUrl ?? part.output.url)}
              title={String(part.output.title)}
            />
          ) : part.input ? (
            <DeckPreviewButton
              deck={part.input as DeckInput}
              images={part.output.previewImages as Record<string, string> | undefined}
              downloadUrl={`${String(part.output.url)}?download=1`}
            />
          ) : null}
          {part.output.pdfUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={`${String(part.output.pdfUrl)}?download=1`}>
                <FileText /> PDF
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <a href={`${String(part.output.editableUrl ?? part.output.url)}?download=1`}>
              <Download /> {part.output.sceneUrl ? c.downloadPpt : t.downloadPptx}
            </a>
          </Button>
        </div>
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

/** Warna ringkas tema PPT (sinkron dengan src/lib/pptx.ts) untuk pratinjau di chat. */
const DECK_THEMES: Record<string, { bg: string; text: string; muted: string; accent: string; accent2: string }> = {
  midnight: { bg: "#0B1020", text: "#F5F7FB", muted: "#9AA4BF", accent: "#7C5CFF", accent2: "#22D3EE" },
  clean: { bg: "#FFFFFF", text: "#0F172A", muted: "#64748B", accent: "#4F46E5", accent2: "#0EA5E9" },
  sunset: { bg: "#FFF9F3", text: "#3B1708", muted: "#8A4B2A", accent: "#EA580C", accent2: "#DB2777" },
  forest: { bg: "#F6FAF5", text: "#13261A", muted: "#4F6B57", accent: "#15803D", accent2: "#CA8A04" },
  ocean: { bg: "#06202E", text: "#EAF6FB", muted: "#8FB8C9", accent: "#06B6D4", accent2: "#F59E0B" },
  luxe: { bg: "#101010", text: "#F5F1E8", muted: "#A8A29E", accent: "#C9A227", accent2: "#E7D9B0" },
  coral: { bg: "#FFFFFF", text: "#1F1235", muted: "#6B5B7B", accent: "#F43F5E", accent2: "#8B5CF6" },
  corporate: { bg: "#FFFFFF", text: "#0B1F3A", muted: "#5B6B82", accent: "#0B5FFF", accent2: "#00B894" },
};

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

/** Blok [[PERBARUI_HASIL]] (instruksi untuk sistem) diganti keterangan singkat untuk user. */
function hideUpdateBlock(text: string, c: ChatText) {
  return text.replace(UPDATE_RESULT_BLOCK, c.updateBlockNote);
}

/** Penanda AI sedang/sudah membaca hasil Tools Pro user (chat biasa). */
function ReadResultChip({ part }: { part: ToolPart }) {
  const c = chatText(useApp().lang);
  const out = part.output as { ok?: boolean; title?: string; tool?: string; link?: string } | undefined;
  const done = part.state === "output-available" || part.state === "output-error";
  const cls = "not-prose inline-flex max-w-full items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground";
  if (!done) {
    return (
      <span className={cn(cls, "animate-pulse")}>
        <FolderOpen className="size-3.5 text-primary" /> {c.readingToolResult}
      </span>
    );
  }
  if (!out?.ok || !out.link) return null;
  return (
    <a href={out.link} className={cn(cls, "hover:bg-accent hover:text-foreground")}>
      <FolderOpen className="size-3.5 shrink-0 text-primary" />
      <span className="truncate">
        {c.readToolResult}<span className="font-medium text-foreground">{out.title}</span>
      </span>
    </a>
  );
}

/** Penanda tautan yang dibaca AI (atau alasan bila tidak bisa dibaca). */
function LinkChip({ link }: { link: LinkPart }) {
  const c = chatText(useApp().lang);
  const cls = "not-prose inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs";
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={link.note ?? link.title ?? link.url}
      className={cn(cls, link.ok ? "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground" : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400")}
    >
      {link.ok ? <Link2 className="size-3.5 shrink-0 text-primary" /> : <Link2Off className="size-3.5 shrink-0" />}
      <span className="truncate">
        {link.ok ? c.readingLink : c.linkUnreadable}
        <span className="font-medium">{link.title ? `${link.title.slice(0, 60)} · ${link.host}` : link.host}</span>
        {!link.ok && link.note ? ` — ${link.note}` : ""}
      </span>
    </a>
  );
}
