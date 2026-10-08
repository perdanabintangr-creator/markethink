"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/components/app/app-context";

export function QuotaDialog({
  open,
  onOpenChange,
  lockedTier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Bila diisi: dialog upgrade untuk otak yang terkunci, bukan kuota habis. */
  lockedTier?: string | null;
}) {
  const { user } = useApp();
  const planLabel = lockedTier?.split("|")[1] === "promax" ? "Promax" : "Pro";
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      body: JSON.stringify({ email: form.get("email"), note: form.get("note") || undefined, planInterest: planLabel.toLowerCase() }),
    });
    setLoading(false);
    if (!res.ok) return toast.error("Gagal mendaftar waitlist.");
    setDone(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />{" "}
            {lockedTier ? `${lockedTier.split("|")[0]} khusus paket ${planLabel}` : "Kredit hari ini sudah habis"}
          </DialogTitle>
          <DialogDescription>
            {lockedTier
              ? `Paket Free memakai Markethink Junior. Pro membuka Senior (strategi & campaign) dan Associate (brand strategy & GTM sekelas konsultan). Promax membuka Director — otak paling pintar yang bisa mengerjakan apa pun — plus kredit jauh lebih banyak. Gabung waitlist ${planLabel}, kami kabari saat dibuka.`
              : "Kredit akan reset otomatis pukul 00.00 WIB. Mau kuota lebih besar? Gabung waitlist Markethink Pro — kami kabari saat sudah tersedia."}
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <p className="rounded-lg bg-primary/10 p-4 text-sm">Kamu sudah masuk waitlist Pro. Terima kasih! 🙌</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wl-email">Email</Label>
              <Input id="wl-email" name="email" type="email" defaultValue={user.email ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-note">Fitur yang paling kamu butuhkan (opsional)</Label>
              <Textarea id="wl-note" name="note" rows={3} maxLength={1000} />
            </div>
            <Button className="w-full" disabled={loading}>Gabung waitlist {lockedTier ? planLabel : "Pro"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
