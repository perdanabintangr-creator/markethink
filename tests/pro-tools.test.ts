/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tes semua Tools Pro per role: tiap file tests/fixtures/pro/<tool>.ts berisi contoh input & hasil AI.
 * Dicek: input lolos validasi form, file PPT/Excel benar-benar terbuat (zip valid), dan judul terisi.
 */

const stored: { name: string; kind: string; bytes: Uint8Array }[] = [];
let nextObject: unknown;

vi.mock("@/lib/addons/runtime", async (orig) => {
  const real = await orig<typeof import("@/lib/addons/runtime")>();
  const store = async (_ctx: unknown, name: string, kind: "pptx" | "xlsx", bytes: Uint8Array | null, label: string) => {
    if (!bytes) return null;
    stored.push({ name, kind, bytes });
    return { id: crypto.randomUUID(), name, mime: "", kind, label };
  };
  return { ...real, aiObject: vi.fn(async () => structuredClone(nextObject)), addCost: vi.fn(), storeToolFile: vi.fn(store), storeMaybe: vi.fn(store) };
});
vi.mock("@/lib/ai/router", () => ({ routeTier: () => ({ model: {}, resolved: () => null, toolFallback: () => null }) }));
vi.mock("ai", async (orig) => ({
  ...(await orig<typeof import("ai")>()),
  generateText: vi.fn(async () => ({ text: "Catatan riset.", usage: {}, sources: [{ sourceType: "url", url: "https://contoh.id", title: "Contoh" }], providerMetadata: {} })),
}));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: { tools: { webSearch_20250305: () => ({}) } } }));

const { RUNNERS } = await import("@/lib/addons/tools");
const { PRO_FORMS } = await import("@/lib/addons/pro/forms");
const { TOOLS } = await import("@/lib/addons/catalog");

interface Fixture {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  kinds: ("pptx" | "xlsx")[];
}
const fixtures = Object.values(import.meta.glob<{ default: Fixture }>("./fixtures/pro/*.ts", { eager: true })).map((m) => m.default);

const admin = {
  from: () => ({ select: () => ({ eq: () => ({ in: async () => ({ data: [] }) }) }) }),
  storage: { from: () => ({ download: async () => ({ data: null }) }) },
};
const ctx = () => ({ admin: admin as never, userId: "u", runId: "r", cost: { usd: 0, model: null } });
const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b;

describe("Tools Pro per role", () => {
  beforeEach(() => {
    stored.length = 0;
  });

  it("setiap tool di katalog punya runner (kecuali kalkulator) & tiap form punya fixture", () => {
    for (const t of TOOLS) if (!t.noQuota) expect(RUNNERS[t.id], `runner ${t.id}`).toBeDefined();
    for (const id of Object.keys(PRO_FORMS)) expect(fixtures.some((f) => f.tool === id), `fixture ${id}`).toBe(true);
  });

  for (const fx of fixtures) {
    it(`${fx.tool}: membuat ${fx.kinds.join(" + ")}`, async () => {
      nextObject = fx.output;
      const runner = RUNNERS[fx.tool];
      const input = runner.input.parse(fx.input);
      const res = await runner.run(ctx(), input);
      expect(res.title.length).toBeGreaterThan(3);
      expect(stored.map((f) => f.kind).sort()).toEqual([...fx.kinds].sort());
      for (const f of stored) expect(isZip(f.bytes)).toBe(true);
    }, 30000);

    it(`${fx.tool}: data tipis (daftar dipangkas ke 1 item) tetap menghasilkan file`, async () => {
      const thin = JSON.parse(JSON.stringify(fx.output), (_k, v) => (Array.isArray(v) && v.length > 1 && typeof v[0] === "object" ? v.slice(0, 1) : v));
      nextObject = thin;
      const runner = RUNNERS[fx.tool];
      const res = await runner.run(ctx(), runner.input.parse(fx.input));
      expect(res.files.length).toBeGreaterThanOrEqual(1);
    }, 30000);
  }
});
