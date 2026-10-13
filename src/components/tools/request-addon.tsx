"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { rupiah } from "./common";

/** Minta pembelian add-on → masuk antrean tim (back office) untuk dikirimi cara bayar. */
export function RequestAddonButton({
  addon,
  name,
  price,
  quota,
  label = "Beli add-on",
  open: controlledOpen,
  onOpenChange,
  ...props
}: {
  addon: string;
  name: string;
  price: number;
  quota: number;
  label?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
} & ButtonProps) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/tools/request", { method: "POST", body: JSON.stringify({ addon, note }) });
    setBusy(false);
    if (!res.ok) return toast.error("Gagal mengirim. Coba lagi.");
    setSent(true);
  }

  return (
    <>
      {controlledOpen === undefined && (
        <Button size="sm" onClick={() => setOpen(true)} {...props}>
          <ShoppingBag /> {label}
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setSent(false);
        }}
      >
        <DialogContent>
          {sent ? (
            <div className="space-y-3 py-2 text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
              <DialogTitle>Permintaan terkirim 🎉</DialogTitle>
              <DialogDescription>
                Tim Markethink akan menghubungi kamu lewat email untuk cara pembayaran. Setelah bayar, add-on {name} langsung aktif 30 hari.
              </DialogDescription>
              <Button onClick={() => setOpen(false)}>Oke</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Beli add-on {name}</DialogTitle>
                <DialogDescription>
                  {rupiah(price)} / bulan · {quota}× pakai per bulan · hasil visual + file PPT/Excel.
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>1. Kirim permintaan ini.</li>
                <li>2. Tim kami mengirim cara bayar (transfer/QRIS) ke email kamu.</li>
                <li>3. Setelah bayar, add-on aktif otomatis 30 hari.</li>
              </ul>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan (opsional), mis. nomor WhatsApp atau pertanyaan"
                maxLength={500}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button onClick={submit} disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />} Kirim permintaan
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
