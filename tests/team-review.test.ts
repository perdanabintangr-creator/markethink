import { describe, expect, it } from "vitest";
import { extractJson } from "@/lib/addons/json-output";
import {
  APPLY_MARKER,
  MIN_REVIEW_CHARS,
  buildApplyMessage,
  buildReviewPrompt,
  reviewSchema,
  reviewerFor,
  shouldReview,
  tidyReview,
} from "@/lib/ai/team-review";

const long = "x".repeat(MIN_REVIEW_CHARS + 10);
const base = { tier: "senior" as const, freePlan: false, enabled: true, answer: long, question: "Strategi naikin penjualan?", deck: false, remainingCredits: 100 };

describe("Tim Otak: kapan jawaban dicek", () => {
  it("Senior ke atas di paket berbayar dicek", () => {
    expect(shouldReview(base)).toBe(true);
    expect(shouldReview({ ...base, tier: "associate" })).toBe(true);
    expect(shouldReview({ ...base, tier: "director" })).toBe(true);
  });
  it("Junior, Free, dimatikan user, PPT, dan jawaban pendek tidak dicek", () => {
    expect(shouldReview({ ...base, tier: "junior" })).toBe(false);
    expect(shouldReview({ ...base, freePlan: true })).toBe(false);
    expect(shouldReview({ ...base, enabled: false })).toBe(false);
    expect(shouldReview({ ...base, deck: true })).toBe(false);
    expect(shouldReview({ ...base, answer: "Halo kak!" })).toBe(false);
  });
  it("jawaban hasil 'Terapkan perbaikan' tidak dicek ulang", () => {
    expect(shouldReview({ ...base, question: `${APPLY_MARKER.id}:\n- a → b` })).toBe(false);
    expect(shouldReview({ ...base, question: `${APPLY_MARKER.en}:\n- a → b` })).toBe(false);
  });
  it("kredit tidak cukup → dilewati", () => {
    expect(shouldReview({ ...base, remainingCredits: 0 })).toBe(false);
    expect(shouldReview({ ...base, tier: "associate", remainingCredits: 5 })).toBe(false);
    expect(shouldReview({ ...base, remainingCredits: null })).toBe(true);
  });
  it("pemeriksa: Senior → Haiku, Head/Director → Sonnet", () => {
    expect(reviewerFor("senior")?.modelId).toBe("claude-haiku-5-5");
    expect(reviewerFor("associate")?.modelId).toBe("claude-sonnet-5-5");
    expect(reviewerFor("director")?.modelId).toBe("claude-sonnet-5-5");
    expect(reviewerFor("junior")).toBeNull();
  });
});

describe("Tim Otak: membaca hasil pemeriksa", () => {
  it("JSON dalam blok kode dirapikan & lolos skema", () => {
    const raw = '```json\n{"summary":"Bagus","distinctScore":82.4,"distinctNote":"Tagline umum","claims":[{"status":"karangan","claim":"70% mahasiswa","note":"tanpa sumber"}],"fixes":[{"issue":"Klise","suggestion":"Ganti tema"}]}\n```';
    const parsed = reviewSchema.safeParse(tidyReview(extractJson(raw)));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.distinctScore).toBe(82);
    // Status tidak dikenal → "perlu_dicek".
    expect(parsed.data.claims[0].status).toBe("perlu_dicek");
  });
  it("teks kepanjangan dipotong, daftar dibatasi", () => {
    const parsed = reviewSchema.safeParse(
      tidyReview({
        summary: "a".repeat(900),
        distinctScore: 140,
        distinctNote: "",
        claims: Array.from({ length: 9 }, () => ({ status: "sumber", claim: "c", note: "n" })),
        fixes: Array.from({ length: 8 }, () => ({ issue: "i", suggestion: "s" })),
      }),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.summary.length).toBe(400);
    expect(parsed.data.distinctScore).toBe(100);
    expect(parsed.data.claims).toHaveLength(6);
    expect(parsed.data.fixes).toHaveLength(5);
  });
});

describe("Tim Otak: pesan & prompt", () => {
  it("pesan 'Terapkan perbaikan' memuat perbaikan & klaim keliru", () => {
    const msg = buildApplyMessage(
      {
        claims: [
          { status: "keliru", claim: "Total Rp1,2 jt", note: "seharusnya Rp1 jt" },
          { status: "sumber", claim: "x", note: "y" },
        ],
        fixes: [{ issue: "Tagline klise", suggestion: "Pakai tema teman ngerjain tugas" }],
      },
      false,
    );
    expect(msg.startsWith(APPLY_MARKER.id)).toBe(true);
    expect(msg).toContain("Tagline klise → Pakai tema teman ngerjain tugas");
    expect(msg).toContain("Keliru: Total Rp1,2 jt");
    expect(msg).not.toContain("- Keliru: x");
  });
  it("prompt menandai pertanyaan & jawaban sebagai data dan mencantumkan sumber", () => {
    const p = buildReviewPrompt({ question: "Q?", answer: "A.", sources: [{ title: "Katadata", url: "https://katadata.co.id/a" }], brand: null, en: false });
    expect(p).toContain("<jawaban>\nA.\n</jawaban>");
    expect(p).toContain("[1] Katadata — https://katadata.co.id/a");
    expect(p).toContain("Bahasa Indonesia");
  });
});
