import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { coerceToSchema, extractJson } from "@/lib/addons/json-output";

const schema = z.object({
  title: z.string(),
  score: z.number(),
  level: z.enum(["rendah", "sedang", "tinggi"]),
  items: z.array(z.object({ name: z.string(), qty: z.number() })),
  notes: z.array(z.string()),
});

describe("JSON hasil AI yang tahan banting", () => {
  it("membaca JSON dalam ```json dan teks pembuka", () => {
    expect(extractJson('Berikut hasilnya:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("memperbaiki JSON yang terpotong di tengah", () => {
    const cut = '{"title":"Plan","items":[{"name":"A","qty":2},{"name":"B","qt';
    const data = extractJson(cut) as { title: string; items: unknown[] };
    expect(data.title).toBe("Plan");
    expect(data.items.length).toBeGreaterThanOrEqual(1);
  });

  it("menyesuaikan tipe kecil: angka berupa teks, enum beda huruf, field hilang", () => {
    const res = coerceToSchema(schema, { title: "X", score: "Rp1.500.000", level: "Tinggi", items: [{ name: "A", qty: "3" }] });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.score).toBe(1500000);
      expect(res.data.level).toBe("tinggi");
      expect(res.data.items[0].qty).toBe(3);
      expect(res.data.notes).toEqual([]);
    }
  });

  it("melaporkan masalah bila memang tidak bisa diperbaiki", () => {
    const res = coerceToSchema(z.object({ a: z.string().min(5) }), { a: "x" });
    expect(res.ok).toBe(false);
  });
});

// Alur aiObject: jawaban terpotong → diulang ringkas; JSON rusak → putaran perbaikan.
const calls: { system: string; extra?: string }[] = [];
const replies: { text: string; finishReason: string }[] = [];
vi.mock("@/lib/ai/router", () => ({ routeTier: () => ({ model: {}, resolved: () => null, toolFallback: () => null }) }));
vi.mock("ai", async (orig) => ({
  ...(await orig<typeof import("ai")>()),
  generateText: vi.fn(async (o: { system: string; prompt?: string }) => {
    calls.push({ system: o.system, extra: o.prompt });
    const r = replies.shift()!;
    return { text: r.text, finishReason: r.finishReason, usage: {} };
  }),
}));
vi.mock("@/lib/pptx", () => ({ buildPresentation: vi.fn(), presentationSchema: { safeParse: () => ({ success: false, error: { issues: [] } }) } }));

describe("aiObject", () => {
  const ctx = () => ({ admin: {} as never, userId: "u", runId: "r", cost: { usd: 0, model: null }, startedAt: Date.now() });
  const ok = '{"title":"T","score":5,"level":"sedang","items":[{"name":"A","qty":1}],"notes":["n"]}';

  it("langsung berhasil bila JSON valid", async () => {
    const { aiObject } = await import("@/lib/addons/runtime");
    calls.length = 0;
    replies.push({ text: ok, finishReason: "stop" });
    const out = await aiObject(ctx(), { schema, system: "S", prompt: "P" });
    expect(out.title).toBe("T");
    expect(calls).toHaveLength(1);
    expect(calls[0].system).toContain("JSON Schema");
  });

  it("jawaban terpotong → diulang dengan instruksi lebih ringkas", async () => {
    const { aiObject } = await import("@/lib/addons/runtime");
    calls.length = 0;
    replies.push({ text: '{"title":"T","score":5,"level":"sedang","items":[{"name":"A"', finishReason: "length" }, { text: ok, finishReason: "stop" });
    const out = await aiObject(ctx(), { schema, system: "S", prompt: "P" });
    expect(out.notes).toEqual(["n"]);
    expect(calls).toHaveLength(2);
    expect(calls[1].extra).toContain("lebih ringkas");
  });

  it("JSON tidak sesuai skema → satu putaran perbaikan", async () => {
    const { aiObject } = await import("@/lib/addons/runtime");
    calls.length = 0;
    replies.push({ text: "maaf saya tidak bisa", finishReason: "stop" }, { text: ok, finishReason: "stop" });
    const out = await aiObject(ctx(), { schema, system: "S", prompt: "P" });
    expect(out.level).toBe("sedang");
    expect(calls).toHaveLength(2);
    expect(calls[1].system).toContain("memperbaiki JSON");
  });
});
