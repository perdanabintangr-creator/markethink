import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/router", () => ({ routeTier: () => ({ model: {}, resolved: () => null, toolFallback: () => null }) }));

const { fitToQuota } = await import("@/lib/agent/brain");
const { AGENT_TOOLS, AGENT_EXCLUDED, AGENT_MAX_STEPS } = await import("@/lib/agent/catalog");
const { RUNNERS } = await import("@/lib/addons/tools");
const { schemaForPrompt, coerceToSchema } = await import("@/lib/addons/json-output");

describe("Marqthink Agent", () => {
  it("tools Agent: semua punya runner AI & form-nya bisa dijelaskan ke AI (JSON Schema)", () => {
    expect(AGENT_TOOLS.length).toBeGreaterThan(15);
    for (const t of AGENT_TOOLS) {
      expect(RUNNERS[t.id], t.id).toBeDefined();
      expect(() => schemaForPrompt(RUNNERS[t.id].input), t.id).not.toThrow();
    }
    for (const id of AGENT_EXCLUDED) expect(AGENT_TOOLS.some((t) => t.id === id)).toBe(false);
  });

  it("rencana dibatasi kuota per grup, tanpa langkah ganda, maks langkah", () => {
    const steps = [
      { tool: "persona", why: "a" },
      { tool: "competitor", why: "b" },
      { tool: "persona", why: "dobel" },
      { tool: "calendar", why: "c" },
      { tool: "script", why: "d" },
      { tool: "ads", why: "butuh file" },
      { tool: "promo", why: "e" },
      { tool: "plan", why: "f" },
    ];
    const out = fitToQuota(steps, { riset_pro: 1, konten_pro: 5, jualan_kit: 0, strategi_pro: Infinity, dokter_iklan: 5 });
    expect(out.map((s) => s.tool)).toEqual(["persona", "calendar", "script", "plan"]);
    expect(out.every((s) => s.status === "pending")).toBe(true);
    const many = fitToQuota(AGENT_TOOLS.map((t) => ({ tool: t.id, why: "x" })), Object.fromEntries(AGENT_TOOLS.map((t) => [t.addon, Infinity])));
    expect(many).toHaveLength(AGENT_MAX_STEPS);
  });

  it("isian brief dari AI yang sedikit keliru tetap lolos validasi form (contoh: kalender konten)", () => {
    const res = coerceToSchema(RUNNERS.calendar.input, {
      brand: "Aisyah Hijab",
      month: "2026-11",
      business: "Toko hijab online untuk mahasiswi & pekerja muda",
      platforms: ["instagram"],
      goal: "sales",
      per_week: "5",
    });
    expect(res.ok).toBe(true);
  });
});

describe("pilihan otak Tools Pro", async () => {
  const { resolveToolTier } = await import("@/lib/addons/tool-tier");
  it("default Senior; Head/Director hanya bila paket membukanya", () => {
    expect(resolveToolTier("director", ["junior", "senior", "associate", "director"])).toBe("director");
    expect(resolveToolTier("director", ["junior", "senior", "associate"])).toBe("senior");
    expect(resolveToolTier("associate", ["junior", "senior", "associate"])).toBe("associate");
    expect(resolveToolTier("associate", ["junior"])).toBe("senior");
    expect(resolveToolTier(undefined, ["director"])).toBe("senior");
  });
});

describe("kuota Director (2 unit)", async () => {
  const { pickSource } = await import("@/lib/addons/entitlement");
  const base = { isAdmin: false, promaxRemaining: 0, paidRemaining: 0, trialRemaining: 0 } as never as Parameters<typeof pickSource>[0];
  it("memilih sumber yang sisanya cukup", () => {
    expect(pickSource({ ...base, paidRemaining: 1 }, 2)).toBeNull();
    expect(pickSource({ ...base, paidRemaining: 1 }, 1)).toBe("paid");
    expect(pickSource({ ...base, promaxRemaining: 1, paidRemaining: 3 }, 2)).toBe("paid");
    expect(pickSource({ ...base, isAdmin: true }, 2)).toBe("admin");
  });
});
