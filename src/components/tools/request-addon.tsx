"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { rupiah } from "./common";
import { useApp } from "@/components/app/app-context";
import { toolsText } from "@/lib/i18n/tools";

/** Minta pembelian add-on → masuk antrean tim (back office) untuk dikirimi cara bayar. */
export function RequestAddonButton({
  addon,
  name,
  price,
  originalPrice,
  quota,
  label,
  open: controlledOpen,
  onOpenChange,
  ...props
}: {
  addon: string;
  name: string;
  price: number;
  /** Harga normal yang dicoret saat promo. */
  originalPrice?: number;
  quota: number;
  label?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
} & ButtonProps) {
  const T = toolsText(useApp().lang);
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
    if (!res.ok) return toast.error(T.sendFailed);
    setSent(true);
  }

  return (
    <>
      {controlledOpen === undefined && (
        <Button size="sm" onClick={() => setOpen(true)} {...props}>
          <ShoppingBag /> {label ?? T.buyAddon}
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
              <DialogTitle>{T.requestSent}</DialogTitle>
              <DialogDescription>{T.requestSentDesc(name)}</DialogDescription>
              <Button onClick={() => setOpen(false)}>{T.ok}</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{T.buyAddonTitle(name)}</DialogTitle>
                <DialogDescription>
                  {T.addonSummary(rupiah(price), quota)}
                  {originalPrice !== undefined && <span className="ml-1 line-through">{T.addonNormalPrice(rupiah(originalPrice))}</span>}
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>{T.addonStep1}</li>
                <li>{T.addonStep2}</li>
                <li>{T.addonStep3}</li>
              </ul>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={T.addonNotePh}
                maxLength={500}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {T.cancel}
                </Button>
                <Button onClick={submit} disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />} {T.sendRequest}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
