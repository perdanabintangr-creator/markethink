"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, CornerDownRight, FileText, Globe, Image as ImageIcon, Loader2, Lock, Paperclip, Square, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/app/app-context";
import { UsageRing } from "@/components/app/usage-ring";
import { cn } from "@/lib/utils";
import { UPLOAD_ERRORS, uploadFile } from "@/lib/upload-client";
import { buildQuotedMessage } from "@/lib/quote";
import { chatText } from "@/lib/i18n/chat";
import { CONNECTOR_APPS, filterApps, findMention, insertMention, mentionsApp, removeMention, type ConnectorApp } from "@/lib/connectors/apps";
import { connectorsText } from "@/lib/i18n/connectors";
import { AppIcon } from "@/components/connectors/app-icon";
import { useConnectorReturnNotice, useConnectors } from "@/components/connectors/use-connectors";

export interface PendingAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  previewUrl?: string;
}

const ACCEPT = ".pdf,.docx,.xlsx,.pptx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,.gif";

export function Composer({
  onSend,
  onStop,
  busy,
  research,
  onResearchChange,
  brainSlot,
  quote,
  onClearQuote,
  prefill,
  autoFocus,
  placeholder,
}: {
  onSend: (text: string, attachments: PendingAttachment[]) => void;
  onStop: () => void;
  busy: boolean;
  research: boolean;
  onResearchChange: (v: boolean) => void;
  /** Tombol pilih otak di toolbar. */
  brainSlot?: React.ReactNode;
  /** Potongan jawaban AI yang sedang ditanyakan (dari blok teks). */
  quote?: string | null;
  onClearQuote?: () => void;
  /** Isi kotak ketik dari luar (chip jalan pintas). `key` berubah tiap kali dipilih. */
  prefill?: { text: string; key: number } | null;
  autoFocus?: boolean;
  /** Teks petunjuk kotak chat (default dari kamus bahasa). */
  placeholder?: string;
}) {
  const { t, lang, researchAllowed } = useApp();
  const c = chatText(lang);
  const router = useRouter();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Mention aplikasi: ketik "@" di awal kata → daftar aplikasi (mis. Canva).
  const cx = connectorsText(lang);
  const connectors = useConnectors();
  useConnectorReturnNotice(lang);
  const [mention, setMention] = useState<{ start: number; caret: number; query: string } | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState<number | null>(null);
  const availableApps = CONNECTOR_APPS.filter((a) => connectors === null || connectors.some((s) => s.id === a.id && s.enabled));
  const mentionApps = mention && mention.start !== mentionDismissed ? filterApps(mention.query, availableApps) : [];
  const mentionOpen = mentionApps.length > 0;
  const usedApps = availableApps.filter((a) => mentionsApp(text, a));

  function updateMention(value: string, caret: number | null, selectionEnd?: number | null) {
    const m = caret !== null && caret === (selectionEnd ?? caret) ? findMention(value, caret) : null;
    if (!m || caret === null) {
      if (mention) setMention(null);
      if (mentionDismissed !== null) setMentionDismissed(null);
      return;
    }
    if (mention?.start === m.start && mention.query === m.query && mention.caret === caret) return;
    if (mention?.start !== m.start || mention.query !== m.query) setMentionIdx(0);
    setMention({ ...m, caret });
  }

  function pickApp(app: ConnectorApp) {
    if (!mention) return;
    const next = insertMention(text, mention.start, mention.caret, app.mention);
    setMention(null);
    if (next.text === text) {
      // Teks tidak berubah (mention sudah lengkap): cukup pindahkan kursor.
      taRef.current?.setSelectionRange(next.caret, next.caret);
      return;
    }
    pendingSelect.current = [next.caret, next.caret];
    setText(next.text);
  }

  // Saat user memilih "Tanyakan", langsung fokus ke kotak ketik.
  useEffect(() => {
    if (quote) taRef.current?.focus();
  }, [quote]);

  // Chip jalan pintas: isi kerangka perintah lalu sorot bagian [..] pertama agar user tinggal mengetik.
  const pendingSelect = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!prefill) return;
    const start = prefill.text.indexOf("[");
    const end = prefill.text.indexOf("]", start);
    pendingSelect.current = start >= 0 && end > start ? [start, end + 1] : [prefill.text.length, prefill.text.length];
    setText(prefill.text);
  }, [prefill]);
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta || !pendingSelect.current) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
    ta.focus();
    ta.setSelectionRange(...pendingSelect.current);
    pendingSelect.current = null;
  }, [text]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files).slice(0, 5)) {
      setUploading((n) => n + 1);
      try {
        const data = await uploadFile<PendingAttachment>(file, { scope: "chat" });
        if ("error" in data) {
          toast.error(`${file.name}: ${("message" in data && data.message) || UPLOAD_ERRORS[data.error] || c.uploadFailed}`);
          continue;
        }
        setAttachments((a) => [
          ...a,
          { ...data, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined },
        ]);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    if (busy || uploading) return;
    const value = text.trim();
    if (!value && !attachments.length && !quote) return;
    const message = value || (attachments.length ? c.analyzeAttached : t.explainPrompt);
    onSend(quote ? buildQuotedMessage(quote, message) : message, attachments);
    onClearQuote?.();
    setText("");
    setMention(null);
    setAttachments([]);
    if (taRef.current) taRef.current.style.height = "auto";
  }

  return (
    <div
      className="relative rounded-2xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void upload(e.dataTransfer.files);
      }}
    >
      {(attachments.length > 0 || uploading > 0) && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {attachments.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5 rounded-lg border bg-background py-1 pl-1 pr-2 text-xs">
              {a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt="" className="size-6 rounded object-cover" />
              ) : a.mime.startsWith("image/") ? (
                <ImageIcon className="size-4" />
              ) : (
                <FileText className="size-4" />
              )}
              <span className="max-w-32 truncate">{a.name}</span>
              <button onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))} aria-label={c.removeAttachment}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          {uploading > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> {c.uploading}
            </span>
          )}
        </div>
      )}
      {quote && (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs">
          <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-primary">{t.replyingTo}</p>
            <p className="line-clamp-2 text-muted-foreground">{quote}</p>
          </div>
          <button onClick={onClearQuote} aria-label={t.cancel} className="text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      {mentionOpen && (
        <div
          role="listbox"
          aria-label={cx.mentionTitle}
          className="absolute bottom-full left-2 z-30 mb-2 w-72 max-w-[calc(100%-1rem)] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{cx.mentionTitle}</p>
          {mentionApps.map((app, i) => {
            const status = connectors?.find((s) => s.id === app.id);
            return (
              <button
                key={app.id}
                type="button"
                role="option"
                aria-selected={i === mentionIdx}
                // mousedown: pilih sebelum textarea kehilangan fokus.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickApp(app);
                }}
                onMouseEnter={() => setMentionIdx(i)}
                className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left", i === mentionIdx ? "bg-accent" : "hover:bg-accent/60")}
              >
                <AppIcon id={app.icon} className="size-7 text-xs" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {app.name}
                    {status && (
                      <span className={cn("text-[10px] font-normal", status.connected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        {status.connected ? cx.connected : cx.notConnected}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{app.description[lang === "en" ? "en" : "id"]}</span>
                </span>
              </button>
            );
          })}
          <p className="px-2.5 pb-1 pt-1 text-[10px] text-muted-foreground">{cx.mentionHint}</p>
        </div>
      )}
      {usedApps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
          {usedApps.map((app) => {
            const status = connectors?.find((x) => x.id === app.id);
            return (
              <span
                key={app.id}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background py-0.5 pl-0.5 pr-1 text-xs shadow-sm"
              >
                <AppIcon id={app.icon} className="size-5 text-[10px]" />
                <span className="font-medium">{cx.usingApp(app.name)}</span>
                {status && (
                  <span
                    className={cn("size-1.5 rounded-full", status.connected ? "bg-emerald-500" : "bg-muted-foreground/50")}
                    title={status.connected ? cx.connected : cx.notConnected}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setText((v) => removeMention(v, app));
                    taRef.current?.focus();
                  }}
                  aria-label={cx.removeApp(app.name)}
                  title={cx.removeApp(app.name)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
          updateMention(e.target.value, e.target.selectionStart, e.target.selectionEnd);
        }}
        onSelect={(e) => updateMention(e.currentTarget.value, e.currentTarget.selectionStart, e.currentTarget.selectionEnd)}
        onBlur={() => setMention(null)}
        onKeyDown={(e) => {
          if (mentionOpen && !e.nativeEvent.isComposing) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const n = mentionApps.length;
              setMentionIdx((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
              return;
            }
            if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
              e.preventDefault();
              pickApp(mentionApps[Math.min(mentionIdx, mentionApps.length - 1)]);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setMentionDismissed(mention?.start ?? null);
              return;
            }
          }
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        onPaste={(e) => {
          if (e.clipboardData.files.length) {
            e.preventDefault();
            void upload(e.clipboardData.files);
          }
        }}
        rows={1}
        autoFocus={autoFocus}
        maxLength={20000}
        placeholder={placeholder ?? t.placeholder}
        className="block max-h-60 w-full resize-none bg-transparent px-4 pt-3 text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-1 p-2">
        <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => upload(e.target.files)} />
        <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} title={t.attach} aria-label={t.attach}>
          <Paperclip />
        </Button>
        {brainSlot}
        <button
          onClick={() =>
            researchAllowed
              ? onResearchChange(!research)
              : toast(c.researchLockedTitle, {
                  description: c.researchLockedDesc,
                  action: { label: c.seePlans, onClick: () => router.push("/pricing") },
                })
          }
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            research && researchAllowed ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
          )}
          aria-pressed={research && researchAllowed}
          title={researchAllowed ? undefined : c.researchLockedHint}
        >
          <Globe className="size-3.5" /> {t.research}
          {!researchAllowed && <Lock className="size-3" />}
        </button>
        <div className="flex-1" />
        <UsageRing />
        {busy ? (
          <Button size="icon" variant="secondary" onClick={onStop} aria-label={t.stop} className="rounded-full">
            <Square className="fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={submit}
            disabled={(!text.trim() && !attachments.length && !quote) || uploading > 0}
            aria-label={t.send}
            className="rounded-full"
          >
            <ArrowUp />
          </Button>
        )}
      </div>
    </div>
  );
}
