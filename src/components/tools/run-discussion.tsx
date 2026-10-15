"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareText, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { emitChatsChanged } from "@/lib/events";

/** Tombol melayang "Bahas di Chat": buka hasil ini di chat utama (otak, Riset Web, upload — seperti chat biasa). */
export function DiscussInChat({ runId }: { runId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tools/runs/${runId}/to-chat`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.chatId) return void toast.error("Gagal membuka chat. Coba lagi.");
      emitChatsChanged();
      router.push(`/chat/${data.chatId}`);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-[1.03] disabled:opacity-70 print:hidden"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareText className="size-4" />} Bahas di Chat
    </button>
  );
}

/** "Perbaiki hasil": buat versi baru sesuai koreksi user (gratis, terbatas per hasil). */
export function ReviseButton({ runId, tool, revisionsLeft }: { runId: string; tool: string; revisionsLeft: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function submit() {
    if (note.trim().length < 5) return toast.error("Tulis dulu apa yang perlu diperbaiki.");
    setBusy(true);
    setElapsed(0);
    try {
      const res = await fetch(`/api/tools/${tool}`, { method: "POST", body: JSON.stringify({ __revise: { runId, note } }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return void toast.error(data.message ?? "Gagal memperbaiki hasil. Coba lagi.");
      toast.success("Versi perbaikan sudah jadi");
      setOpen(false);
      emitChatsChanged();
      router.push(`/tools/${tool}/${data.runId}`);
      router.refresh();
    } catch {
      toast.error("Koneksi terputus. Cek riwayat beberapa saat lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={revisionsLeft <= 0} className="print:hidden">
        <Wand2 /> Perbaiki hasil {revisionsLeft > 0 ? `(gratis, sisa ${revisionsLeft}×)` : "(batas tercapai)"}
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perbaiki hasil</DialogTitle>
            <DialogDescription>
              Tulis data yang salah atau maksud yang sebenarnya. Hasil baru (termasuk PPT & Excel) dibuat ulang — gratis, tidak memotong kuota.
              Bingung mana yang perlu dikoreksi? Bahas dulu lewat “Bahas di Chat”.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            maxLength={3000}
            autoFocus
            placeholder={"mis.\n- Harga per sesi Rp25.000 (bukan Rp35.000)\n- Booth aktif 23\n- Tujuan utama: naikkan sesi di hari kerja, bukan buka titik baru"}
          />
          <div className="flex items-center justify-end gap-2">
            {busy && <span className="mr-auto text-xs text-muted-foreground">Biasanya 40–120 detik. Jangan tutup halaman ini.</span>}
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="button" onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? `Memperbaiki… ${elapsed}s` : "Buat versi perbaikan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
