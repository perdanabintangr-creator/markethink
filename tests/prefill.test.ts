import { describe, expect, it } from "vitest";
import { prefillFields, sanitizePrefill } from "@/lib/addons/prefill";
import { sizingInput } from "@/lib/addons/schemas";

describe("isi form otomatis", () => {
  it("field Tools Pro diambil dari form (tanpa upload)", () => {
    const f = prefillFields("calendar");
    expect(f.map((x) => x.name)).toEqual(expect.arrayContaining(["brand", "business", "platforms", "goal", "per_week"]));
    expect(f.find((x) => x.name === "goal")?.options?.some((o) => o.startsWith("sales"))).toBe(true);
  });
  it("field tool lama diambil dari skema input", () => {
    const f = prefillFields("sizing", sizingInput);
    expect(f.find((x) => x.name === "product")?.type).toBe("text");
    expect(f.find((x) => x.name === "model")?.options).toEqual(["b2c", "b2b", "keduanya"]);
  });
  it("hanya nilai valid yang dipakai", () => {
    const f = prefillFields("calendar");
    const out = sanitizePrefill(f, {
      brand: "  Kopi Senja ",
      goal: "sales (Penjualan)",
      platforms: ["instagram", "myspace"],
      per_week: 99,
      unknown_field: "x",
      tone: "",
    });
    expect(out.brand).toBe("Kopi Senja");
    expect(out.goal).toBe("sales");
    expect(out.platforms).toEqual(["instagram"]);
    expect(out.per_week).toBe(14);
    expect(out).not.toHaveProperty("unknown_field");
    expect(out).not.toHaveProperty("tone");
    expect(sanitizePrefill(f, { goal: "bukan-pilihan" })).toEqual({});
  });
});
