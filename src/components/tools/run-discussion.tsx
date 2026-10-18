"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareText, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { emitChatsChanged } from "@/lib/events";
import { readToolTierPref } from "@/lib/addons/tool-tier";
import { WorkingShowcase } from "@/components/tools/working-showcase";
import { useApp } from "@/components/app/app-context";
import { toolsText } from "@/lib/i18n/tools";

/** Tombol melayang "Bahas di Chat": buka hasil ini di chat utama (otak, Riset Web, upload — seperti chat biasa). */
export function DiscussInChat({ runId }: { runId: string }) {
  const router = useRouter();
  const T = toolsText(useApp().lang);
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tools/runs/${runId}/to-chat`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.chatId) return void toast.error(T.openChatFailed);
      emitChatsChanged();
      router.push(`/chat/${data.chatId}`);
    } catch {
      toast.error(T.connectionLost);
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
      {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareText className="size-4" />} {T.discussInChat}
    </button>
  );
}

/** "Perbaiki hasil": buat versi baru sesuai koreksi user (memakai kuota, lebih hemat dari membuat baru; terbatas per hasil). */
export function ReviseButton({ runId, tool, revisionsLeft }: { runId: string; tool: string; revisionsLeft: number }) {
  const router = useRouter();
  const T = toolsText(useApp().lang);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (note.trim().length < 5) return toast.error(T.reviseNoteTooShort);
    setBusy(true);
    try {
      const res = await fetch(`/api/tools/${tool}`, { method: "POST", body: JSON.stringify({ __revise: { runId, note }, __tier: readToolTierPref() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return void toast.error(data.message ?? T.reviseFailed);
      toast.success(T.reviseDone);
      setOpen(false);
      emitChatsChanged();
      router.push(`/tools/${tool}/${data.runId}`);
      router.refresh();
    } catch {
      toast.error(T.connectionLostRevise);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={revisionsLeft <= 0} className="print:hidden">
        <Wand2 /> {T.reviseResult} {revisionsLeft > 0 ? T.revisionsLeft(revisionsLeft) : T.revisionLimit}
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{T.reviseResult}</DialogTitle>
            <DialogDescription>
              {T.reviseDesc} {T.reviseDescChat}
            </DialogDescription>
          </DialogHeader>
          {busy ? (
            <div className="flex justify-center py-4">
              <WorkingShowcase tool={tool} typical={90} title={T.craftingRevision} note={T.dontClose} steps={T.reviseSteps} compact />
            </div>
          ) : (
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            maxLength={3000}
            autoFocus
            placeholder={T.revisePh}
          />
          )}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {T.cancel}
            </Button>
            <Button type="button" onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? T.revising : T.createRevision}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
