import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fx from "./fixtures/tools";

const stored: { name: string; kind: string; bytes: Uint8Array }[] = [];
let nextObject: unknown;

vi.mock("@/lib/addons/runtime", async (orig) => {
  const real = await orig<typeof import("@/lib/addons/runtime")>();
  const store = async (_ctx: unknown, name: string, kind: "pptx" | "xlsx", bytes: Uint8Array | null, label: string) => {
    if (!bytes) return null;
    stored.push({ name, kind, bytes });
    return { id: crypto.randomUUID(), name, mime: "", kind, label };
  };
  return {
    ...real,
    aiObject: vi.fn(async () => structuredClone(nextObject)),
    addCost: vi.fn(),
    storeToolFile: vi.fn(store),
    storeMaybe: vi.fn(store),
  };
});
vi.mock("@/lib/ai/router", () => ({ routeTier: () => ({ model: {}, resolved: () => null, toolFallback: () => null }) }));
vi.mock("ai", async (orig) => ({
  ...(await orig<typeof import("ai")>()),
  generateText: vi.fn(async () => ({
    text: "Catatan riset kompetitor.",
    usage: {},
    sources: [{ sourceType: "url", url: "https://contoh.id", title: "Contoh" }],
    providerMetadata: {},
  })),
}));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: { tools: { webSearch_20250305: () => ({}) } } }));

const { RUNNERS } = await import("@/lib/addons/tools");

let attachmentRows: Record<string, unknown>[] = [];
const admin = {
  from: () => ({ select: () => ({ eq: () => ({ in: async () => ({ data: attachmentRows }) }) }) }),
  storage: { from: () => ({ download: async () => ({ data: new Blob([new Uint8Array([37, 80, 68, 70])]) }) }) },
};
const csvRow = { id: "a", name: "laporan.csv", mime: "text/csv", storage_path: "p", extracted_text: "Kampanye,Biaya,Pembelian\nA,1000000,30" };
const ctx = () => ({ admin: admin as never, userId: "u", runId: "r", cost: { usd: 0, model: null } });

const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b;

const cases = [
  ["listing", fx.listingFixture, { product: "Kopi Susu Literan", features: "Gula aren asli tanpa pengawet", platforms: ["shopee", "tiktok"], current_title: "kopi susu 1L" }, ["xlsx"]],
  ["live", fx.liveFixture, { products: "Kopi susu 1L Rp45rb", duration: 60, host_style: "energik", platform: "tiktok" }, ["pptx", "xlsx"]],
  ["whatsapp", fx.whatsappFixture, { business: "Kopi Senja", goals: ["broadcast_promo", "follow_up", "faq"], tone: "ramah" }, ["xlsx"]],
  ["ads", fx.adsFixture, { platform: "meta", goal: "penjualan", attachment_ids: ["7d1d0a3e-1b7a-4f6e-9c8a-2a8f0b1c3d4e"] }, ["pptx", "xlsx"]],
  ["competitor", fx.competitorFixture, { brand: "Kopi Senja", product: "Kopi literan", competitors: "Kopi Kenangan, Fore, Tuku" }, ["pptx", "xlsx"]],
  ["kol", fx.kolFixture, { brand: "Kopi Senja", product: "Kopi literan", objective: "penjualan", platform: "tiktok", tiers: ["nano", "micro"], creators: 5 }, ["pptx", "xlsx"]],
  ["sizing", fx.sizingFixture, { product: "Kopi susu literan", area: "Jabodetabek" }, ["pptx", "xlsx"]],
  ["persona", fx.personaFixture, { product: "Kopi susu literan", brand: "Kopi Senja" }, ["pptx", "xlsx"]],
  ["entry", fx.entryFixture, { idea: "Jual dimsum frozen premium untuk keluarga muda", brand: "Dimsum Mama" }, ["pptx", "xlsx"]],
  ["survey", fx.surveyFixture, { objective: "Minat beli kopi literan gula aren", respondents: "Pekerja 20-35 th", topics: ["harga", "kepuasan"] }, ["xlsx"]],
] as const;

describe("tools add-on: hasil AI → file PPT & Excel", () => {
  beforeEach(() => {
    stored.length = 0;
    attachmentRows = [csvRow];
  });

  for (const [tool, fixture, rawInput, kinds] of cases) {
    it(`${tool}: membuat ${kinds.join(" + ")}`, async () => {
      nextObject = fixture;
      const runner = RUNNERS[tool];
      const input = runner.input.parse(rawInput);
      const res = await runner.run(ctx(), input);
      expect(res.title.length).toBeGreaterThan(0);
      expect(stored.map((f) => f.kind).sort()).toEqual([...kinds].sort());
      for (const f of stored) expect(isZip(f.bytes)).toBe(true);
      expect(res.files).toHaveLength(kinds.length);
    }, 30000);
  }

  it("listing: platform yang tidak diminta dibuang & before_after null bila tanpa judul lama", async () => {
    nextObject = fx.listingFixture;
    const runner = RUNNERS.listing;
    const res = await runner.run(ctx(), runner.input.parse({ product: "Kopi", features: "Gula aren asli tanpa pengawet", platforms: ["shopee"] }));
    const out = res.output as { listings: { platform: string }[]; before_after: unknown };
    expect(out.listings.map((l) => l.platform)).toEqual(["shopee"]);
    expect(out.before_after).toBeNull();
  });

  it("entry: skor kelayakan dihitung program dari scorecard", async () => {
    nextObject = fx.entryFixture;
    const runner = RUNNERS.entry;
    const res = await runner.run(ctx(), runner.input.parse(cases[8][2]));
    // 0.25×80 + 0.2×50 + 0.2×70 + 0.15×70 + 0.2×60 = 66.5 → 67
    expect((res.output as { weighted_score: number }).weighted_score).toBe(67);
  });

  it("sizing: urutan TAM ≥ SAM ≥ SOM dijaga", async () => {
    nextObject = { ...fx.sizingFixture, som: { ...fx.sizingFixture.som, value_idr: 5e12 } };
    const runner = RUNNERS.sizing;
    const res = await runner.run(ctx(), runner.input.parse(cases[6][2]));
    const out = res.output as { sam: { value_idr: number }; som: { value_idr: number } };
    expect(out.som.value_idr).toBeLessThanOrEqual(out.sam.value_idr);
  });

  it("survey: jumlah responden dihitung rumus & nomor pertanyaan dirapikan", async () => {
    nextObject = fx.surveyFixture;
    const runner = RUNNERS.survey;
    const res = await runner.run(ctx(), runner.input.parse({ ...cases[9][2], margin: 5, population: 0 }));
    const out = res.output as { sample: { n: number; recommended: number }; sections: { questions: { code: string }[] }[] };
    expect(out.sample.n).toBe(385);
    expect(out.sample.recommended).toBe(462);
    expect(out.sections.flatMap((s) => s.questions.map((q) => q.code))).toEqual(["Q1", "Q2", "Q3"]);
  });

  it("validasi input: form kosong ditolak dengan pesan jelas", () => {
    const r = RUNNERS.ads.input.safeParse({ platform: "meta", goal: "penjualan", attachment_ids: [] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/Upload/);
  });

  // Hasil AI yang tipis (1 data) tidak boleh menggagalkan hasil — kasus nyata: laporan iklan dengan 1 kampanye.
  const thin = {
    ads: {
      ...fx.adsFixture,
      campaigns: [fx.adsFixture.campaigns[0]],
      budget_plan: [fx.adsFixture.budget_plan[0]],
      next_steps: [fx.adsFixture.next_steps[0]],
      wins: [],
      problems: ["Data terbatas"],
      totals: { spend: 1000000, revenue: null, results: 30, roas: null, cpa: 33333, ctr: null },
    },
    live: { ...fx.liveFixture, segments: [fx.liveFixture.segments[0]], objections: [fx.liveFixture.objections[0]], opening_hooks: [], closing_lines: [] },
    competitor: {
      ...fx.competitorFixture,
      competitors: [fx.competitorFixture.competitors[0]],
      content_gaps: [fx.competitorFixture.content_gaps[0]],
      recommendations: [fx.competitorFixture.recommendations[0]],
    },
    kol: { ...fx.kolFixture, deliverables: [], timeline: [fx.kolFixture.timeline[0]], kpis: [fx.kolFixture.kpis[0]], fee_estimate: { ...fx.kolFixture.fee_estimate, rows: [] } },
  } as const;

  for (const [tool, fixture, rawInput] of cases) {
    if (!(tool in thin)) continue;
    it(`${tool}: data tipis tetap menghasilkan file (PPT diperbaiki otomatis)`, async () => {
      nextObject = thin[tool as keyof typeof thin];
      void fixture;
      const runner = RUNNERS[tool];
      const res = await runner.run(ctx(), runner.input.parse(rawInput));
      expect(res.files.length).toBeGreaterThanOrEqual(1);
      expect(stored.some((f) => f.kind === "xlsx")).toBe(true);
      expect(stored.some((f) => f.kind === "pptx")).toBe(true);
    }, 30000);
  }

  it("ads: PDF hasil scan dikirim ke AI sebagai file (dibaca visual)", async () => {
    const { aiObject } = await import("@/lib/addons/runtime");
    attachmentRows = [{ id: "b", name: "laporan.pdf", mime: "application/pdf", storage_path: "p", extracted_text: "\n\n" }];
    nextObject = fx.adsFixture;
    const runner = RUNNERS.ads;
    await runner.run(ctx(), runner.input.parse(cases[3][2]));
    const call = vi.mocked(aiObject).mock.calls.at(-1)![1] as { vision?: boolean; messages: { content: { type: string; mediaType?: string }[] }[] };
    expect(call.vision).toBe(true);
    expect(call.messages[0].content.some((p) => p.type === "file" && p.mediaType === "application/pdf")).toBe(true);
  });

  it("ads: file yang tidak terbaca sama sekali → pesan jelas, bukan hasil karangan", async () => {
    attachmentRows = [{ id: "c", name: "kosong.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", storage_path: "p", extracted_text: null }];
    nextObject = fx.adsFixture;
    const runner = RUNNERS.ads;
    await expect(runner.run(ctx(), runner.input.parse(cases[3][2]))).rejects.toThrow("FILE_UNREADABLE");
  });
});
