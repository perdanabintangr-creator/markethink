"use client";

import { TeamReviewCard } from "@/components/chat/team-review-card";
import { REVISE_EVENT } from "@/components/tools/run-discussion";
import { useApp } from "@/components/app/app-context";
import { buildReviseNote, type ReviewPart } from "@/lib/ai/team-review";

/** Hasil Pemeriksaan Tim di halaman hasil Smart Tools; "Terapkan perbaikan" membuka dialog Perbaiki hasil. */
export function ToolReview({ review, canRevise }: { review: ReviewPart; canRevise: boolean }) {
  const { lang } = useApp();
  return (
    <div className="print:hidden">
      <TeamReviewCard
        review={review}
        lang={lang}
        onApply={canRevise ? () => window.dispatchEvent(new CustomEvent(REVISE_EVENT, { detail: buildReviseNote(review, lang === "en") })) : undefined}
      />
    </div>
  );
}
