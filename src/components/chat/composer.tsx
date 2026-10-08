"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, CornerDownRight, FileText, Globe, Image as ImageIcon, Loader2, Paperclip, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/app/app-context";
import { cn } from "@/lib/utils";
import { UPLOAD_ERRORS, uploadFile } from "@/lib/upload-client";
import { buildQuotedMessage } from "@/lib/quote";

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
}) {
  const { t } = useApp();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Saat user memilih "Tanyakan", langsung fokus ke kotak ketik.
  useEffect(() => {
    if (quote) taRef.current?.focus();
  }, [quote]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files).slice(0, 5)) {
      setUploading((n) => n + 1);
      try {
        const data = await uploadFile<PendingAttachment>(file, { scope: "chat" });
        if ("error" in data) {
          toast.error(`${file.name}: ${UPLOAD_ERRORS[data.error] ?? "Upload gagal."}`);
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
    const message = value || (attachments.length ? "Tolong analisis file terlampir." : t.explainPrompt);
    onSend(quote ? buildQuotedMessage(quote, message) : message, attachments);
    onClearQuote?.();
    setText("");
    setAttachments([]);
    if (taRef.current) taRef.current.style.height = "auto";
  }

  return (
    <div
      className="rounded-2xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring"
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
              <button onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))} aria-label="Hapus lampiran">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          {uploading > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Mengunggah…
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
          <button onClick={onClearQuote} aria-label="Batal" className="text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
        }}
        onKeyDown={(e) => {
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
        maxLength={20000}
        placeholder={t.placeholder}
        className="block max-h-60 w-full resize-none bg-transparent px-4 pt-3 text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-1 p-2">
        <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => upload(e.target.files)} />
        <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} title={t.attach} aria-label={t.attach}>
          <Paperclip />
        </Button>
        {brainSlot}
        <button
          onClick={() => onResearchChange(!research)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            research ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
          )}
          aria-pressed={research}
        >
          <Globe className="size-3.5" /> {t.research}
        </button>
        <div className="flex-1" />
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
