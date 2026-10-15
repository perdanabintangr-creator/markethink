"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2, MessageSquareText, Sparkles, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/chat/markdown";
import { emitChatsChanged } from "@/lib/events";
import { cn } from "@/lib/utils";

interface Msg {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Angka-angka ini dihitung dari mana?",
  "Ada data yang salah, saya koreksi ya:",
  "Maksud & tujuan saya sebenarnya:",
  "Bagian mana yang paling penting dikerjakan duluan?",
];

const KOREKSI = /\[\[KOREKSI\]\]([\s\S]*?)\[\[\/KOREKSI\]\]/;

/** Ambil ringkasan koreksi terakhir dari jawaban AI (untuk tombol "Perbaiki hasil"). */
function lastCorrection(messages: Msg[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const hit = m.content.match(KOREKSI);
    if (hit) return hit[1].trim();
  }
  return "";
}

/**
 * Panel diskusi di halaman hasil Tools Pro: tanya tentang hasil, koreksi data/maksud, lalu "Perbaiki hasil" (revisi gratis).
 */
export function RunDiscussion({ runId, tool, revisable, revisionsLeft }: { runId: string; tool: string; revisable: boolean; revisionsLeft: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [fixOpen, setFixOpen] = useState(false);
  const [note, setNote] = useState("");
  const [fixing, setFixing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    void fetch(`/api/tools/runs/${runId}/chat`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d: { messages: Msg[] }) => setMessages(d.messages))
      .finally(() => setLoaded(true));
  }, [open, loaded, runId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (!fixing) return;
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [fixing]);

  async function send(content: string) {
    const msg = content.trim();
    if (!msg || busy) return;
    setText("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch(`/api/tools/runs/${runId}/chat`, { method: "POST", body: JSON.stringify({ message: msg }) });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Gagal menjawab. Coba lagi.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: "Maaf, belum ada jawaban. Coba tanya lagi." }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menjawab.");
      setMessages((m) => m.slice(0, -2));
      setText(msg);
    } finally {
      setBusy(false);
    }
  }

  function openFix() {
    setNote(lastCorrection(messages).replace(/^-\s*/gm, "- "));
    setFixOpen(true);
  }

  async function applyFix() {
    if (note.trim().length < 5) return toast.error("Tulis dulu apa yang perlu diperbaiki.");
    setFixing(true);
    setElapsed(0);
    try {
      const res = await fetch(`/api/tools/${tool}`, { method: "POST", body: JSON.stringify({ __revise: { runId, note } }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return void toast.error(data.message ?? "Gagal memperbaiki hasil. Coba lagi.");
      toast.success("Versi perbaikan sudah jadi");
      emitChatsChanged();
      router.push(`/tools/${tool}/${data.runId}`);
      router.refresh();
    } catch {
      toast.error("Koneksi terputus. Cek riwayat beberapa saat lagi.");
    } finally {
      setFixing(false);
    }
  }

  const correction = lastCorrection(messages);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-[1.03] print:hidden"
        >
          <MessageSquareText className="size-4" /> Diskusikan hasil ini
        </button>
      )}

      {open && (
        <aside className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l bg-background shadow-2xl sm:w-[420px] print:hidden">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <p className="font-semibold">Diskusikan hasil ini</p>
              <p className="text-xs text-muted-foreground">Tanya alasan, koreksi data, atau jelaskan maksudmu · 2 kredit/pertanyaan</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-accent" aria-label="Tutup">
              <X className="size-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {loaded && !messages.length && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Ada angka yang tidak sesuai, data yang salah, atau tujuan yang keliru dipahami? Tanyakan atau koreksi di sini.
                  {revisable && " Setelah itu tekan “Perbaiki hasil” untuk membuat versi baru tanpa memotong kuota."}
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        if (s.endsWith(":")) {
                          setText(`${s} `);
                          inputRef.current?.focus();
                        } else void send(s);
                      }}
                      className="rounded-xl border px-3 py-2 text-left text-sm hover:border-primary/50 hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!loaded && <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />}
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[90%] rounded-2xl px-3 py-2 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {m.role === "assistant" ? (
                    m.content ? (
                      <Markdown className="prose-sm">{m.content.replace(KOREKSI, (_x, body: string) => `\n\n**Ringkasan koreksi:**\n${body.trim()}`)}</Markdown>
                    ) : (
                      <Loader2 className="size-4 animate-spin" />
                    )
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {revisable && (
            <div className="border-t px-4 py-3">
              {!fixOpen ? (
                <Button type="button" variant={correction ? "default" : "outline"} className="w-full" onClick={openFix} disabled={revisionsLeft <= 0}>
                  <Wand2 /> Perbaiki hasil {revisionsLeft > 0 ? `(gratis, sisa ${revisionsLeft}×)` : "(batas tercapai)"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Apa yang perlu diperbaiki?</p>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} maxLength={3000} placeholder="mis. Harga per sesi Rp25.000 (bukan Rp35.000). Booth aktif 23. Tujuan utama: naikkan sesi di weekday, bukan buka titik baru." />
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFixOpen(false)} disabled={fixing}>
                      Batal
                    </Button>
                    <Button type="button" size="sm" className="flex-1" onClick={applyFix} disabled={fixing}>
                      {fixing ? <Loader2 className="animate-spin" /> : <Sparkles />} {fixing ? `Memperbaiki… ${elapsed}s` : "Buat versi perbaikan"}
                    </Button>
                  </div>
                  {fixing && <p className="text-xs text-muted-foreground">Biasanya 40–120 detik. Jangan tutup halaman ini.</p>}
                </div>
              )}
            </div>
          )}

          <form
            className="flex items-end gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            <Textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(text);
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Tanya atau koreksi hasil ini…"
              className="min-h-0 resize-none"
            />
            <Button type="submit" size="icon" disabled={busy || !text.trim()} aria-label="Kirim">
              {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
            </Button>
          </form>
        </aside>
      )}
    </>
  );
}
