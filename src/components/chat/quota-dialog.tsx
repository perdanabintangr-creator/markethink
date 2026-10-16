"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PLAN_LABEL, type PlanId } from "@/lib/ai/models.config";

export function QuotaDialog({
  open,
  onOpenChange,
  lockedTier,
  notice,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Bila diisi ("Label|planId"): dialog upgrade untuk otak yang terkunci, bukan kredit habis. */
  lockedTier?: string | null;
  /** Bila diisi: batas harian paket Free (mis. 20 chat/hari) tercapai. */
  notice?: string | null;
}) {
  const [tierLabel, planId] = lockedTier?.split("|") ?? [];
  const planLabel = PLAN_LABEL[(planId as PlanId) ?? "pro"] ?? "Pro";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />{" "}
            {lockedTier ? `${tierLabel} mulai paket ${planLabel}` : notice ? "Batas harian tercapai" : "Kuota bulan ini sudah habis"}
          </DialogTitle>
          <DialogDescription>
            {notice
              ? `${notice} Paket berbayar tidak punya batas harian — cukup kuota bulanan.`
              : lockedTier
                ? "Starter membuka Senior (strategi & campaign) + semua Tools Pro. Pro menambah Associate (sekelas konsultan) & Markethink Agent. Promax membuka Director — otak paling cerdas."
                : "Kuota direset otomatis tiap tanggal 1 pukul 00.00 WIB. Butuh lebih banyak sekarang? Upgrade paket untuk kuota bulanan yang lebih besar."}
          </DialogDescription>
        </DialogHeader>
        <Button asChild className="w-full" onClick={() => onOpenChange(false)}>
          <Link href="/pricing">Lihat paket & harga</Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
