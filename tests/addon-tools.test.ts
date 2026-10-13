import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fx from "./fixtures/tools";

const stored: { name: string; kind: string; bytes: Uint8Array }[] = [];
let nextObject: unknown;

vi.mock("@/lib/addons/runtime", async (orig) => {
  const real = await orig<typeof import("@/lib/addons/runtime")>();
  return {
    ...real,
    aiObject: vi.fn(async () => structuredClone(nextObject)),
    addCost: vi.fn(),
    storeToolFile: vi.fn(async (_ctx: unknown, name: string, kind: "pptx" | "xlsx", bytes: Uint8Array, label: string) => {
      stored.push({ name, kind, bytes });
      return { id: crypto.randomUUID(), name, mime: "", kind, label };
    }),
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

const admin = {
  from: () => ({
    select: () => ({
      eq: () => ({
        in: async () => ({ data: [{ id: "a", name: "laporan.csv", mime: "text/csv", storage_path: "p", extracted_text: "Kampanye,Biaya,Pembelian\nA,1000000,30" }] }),
      }),
    }),
  }),
};
const ctx = () => ({ admin: admin as never, userId: "u", runId: "r", cost: { usd: 0, model: null } });

const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b;

const cases = [
  ["listing", fx.listingFixture, { product: "Kopi Susu Literan", features: "Gula aren asli tanpa pengawet", platforms: ["shopee", "tiktok"], current_title: "kopi susu 1L" }, ["xlsx"]],
  ["live", fx.liveFixture, { products: "Kopi susu 1L Rp45rb", duration: 60, host_style: "energik", platform: "tiktok" }, ["pptx", "xlsx"]],
  ["whatsapp", fx.whatsappFixture, { business: "Kopi Senja", goals: ["broadcast_promo", "follow_up", "faq"], tone: "ramah" }, ["xlsx"]],
  ["ads", fx.adsFixture, { platform: "meta", goal: "penjualan", attachment_ids: ["7d1d0a3e-1b7a-4f6e-9c8a-2a8f0b1c3d4e"] }, ["pptx", "xlsx"]],
  ["competitor", fx.competitorFixture, { brand: "Kopi Senja", product: "Kopi literan", competitors: "Kopi Kenangan, Fore, Tuku" }, ["pptx", "xlsx"]],
  ["kol", fx.kolFixture, { brand: "Kopi Senja", product: "Kopi literan", objective: "penjualan", platform: "tiktok", tiers: ["nano", "micro"], creators: 5 }, ["pptx", "xlsx"]],
] as const;

describe("tools add-on: hasil AI → file PPT & Excel", () => {
  beforeEach(() => {
    stored.length = 0;
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

  it("validasi input: form kosong ditolak dengan pesan jelas", () => {
    const r = RUNNERS.ads.input.safeParse({ platform: "meta", goal: "penjualan", attachment_ids: [] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/Upload/);
  });
});
