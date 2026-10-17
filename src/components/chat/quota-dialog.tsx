"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PLAN_LABEL, type PlanId } from "@/lib/ai/models.config";
import { useApp } from "@/components/app/app-context";
import { chatText } from "@/lib/i18n/chat";

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
  const c = chatText(useApp().lang);
  const [tierLabel, planId] = lockedTier?.split("|") ?? [];
  const planLabel = PLAN_LABEL[(planId as PlanId) ?? "pro"] ?? "Pro";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />{" "}
            {lockedTier ? c.tierLockedTitle(tierLabel, planLabel) : notice ? c.dailyLimitTitle : c.quotaTitle}
          </DialogTitle>
          <DialogDescription>
            {notice
              ? c.dailyLimitDesc(notice)
              : lockedTier
                ? c.tierLockedDesc
                : c.quotaDesc}
          </DialogDescription>
        </DialogHeader>
        <Button asChild className="w-full" onClick={() => onOpenChange(false)}>
          <Link href="/pricing">{c.seePlansPricing}</Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
