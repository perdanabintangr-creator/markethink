"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildApplyMessage, type ClaimStatus, type ReviewPart } from "@/lib/ai/team-review";
import { chatText } from "@/lib/i18n/chat";
import type { Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

const CHIP: Record<ClaimStatus, string> = {
  sumber: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  perkiraan: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  perlu_dicek: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
  keliru: "bg-red-500/12 text-red-700 dark:text-red-400",
};

/** Kartu "Hasil Pemeriksaan Tim" (Kritikus + Pemeriksa Fakta) di bawah jawaban Senior ke atas. */
export function TeamReviewCard({ review, lang, onApply }: { review: ReviewPart; lang: Lang; onApply?: (text: string) => void }) {
  const c = chatText(lang);
  const [open, setOpen] = useState(false);
  const wrong = review.claims.filter((x) => x.status === "keliru").length;
  const fixCount = review.fixes.length + wrong;
  const score = Math.max(0, Math.min(100, review.distinctScore));

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-card p-3 text-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="size-4 text-primary" /> {c.reviewTitle}
        </p>
        {review.credits > 0 && <span className="text-[11px] text-muted-foreground">{c.reviewCredits(review.credits)}</span>}
      </div>

      {review.summary && <p className="text-muted-foreground">{review.summary}</p>}

      <div className="space-y-1.5" title={c.reviewScoreHint}>
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium">{c.reviewScore}</span>
          <span className="font-semibold tabular-nums">{score}/100</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label={c.reviewScore}>
          <div className="h-full rounded-full bg-gradient-to-r from-[#0a6cff] to-[#12d0f5]" style={{ width: `${score}%` }} />
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t pt-3">
          {review.distinctNote && <p className="text-xs text-muted-foreground">{review.distinctNote}</p>}
          {review.claims.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.reviewClaims}</p>
              <ul className="space-y-2">
                {review.claims.map((x, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", CHIP[x.status])}>
                      {c.reviewStatus[x.status]}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium">{x.claim}</span>
                      {x.note && <span className="text-muted-foreground"> — {x.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.reviewFixes}</p>
            {review.fixes.length ? (
              <ol className="list-decimal space-y-1.5 pl-5">
                {review.fixes.map((f, i) => (
                  <li key={i}>
                    <span className="font-medium">{f.issue}</span>
                    <span className="block text-muted-foreground">{f.suggestion}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground">{c.reviewNoFixes}</p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{c.reviewOffHint}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {onApply && fixCount > 0 && (
          <Button size="sm" className="h-8" onClick={() => onApply(buildApplyMessage(review, lang === "en"))}>
            <Wand2 /> {c.reviewApply}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? c.reviewHide : c.reviewDetail(fixCount)}
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      </div>
    </div>
  );
}
