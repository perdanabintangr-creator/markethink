import { expect, it } from "vitest";
import { z } from "zod";
import { clampToSchema } from "@/lib/schema-clamp";
import { presentationSchema } from "@/lib/pptx";

const JSON_SCHEMA = z.toJSONSchema(presentationSchema) as Parameters<typeof clampToSchema>[1];

it("isi PPT yang melebihi batas (gaya Director) dirapikan sampai lolos validasi", () => {
  const raw = {
    title: "SEGERRRRR — Pitch Deck Investor: Kopi Keliling Gerobak Listrik Jakarta Selatan Menuju 15 Gerobak dalam 12 Bulan",
    theme: "mint-orange",
    slides: [
      { layout: "bullets", title: "Masalah", bullets: Array.from({ length: 9 }, (_, i) => `Poin ${i}`) },
      { layout: "stats", title: "Traksi", stats: [{ value: "Rp1,2 miliar/tahun", label: "omzet" }, { value: "150 cup", label: "per hari" }] },
      { layout: "table", title: "Unit economics", table: { headers: ["A", "B", "C", "D", "E", "F"], rows: Array.from({ length: 10 }, () => ["1", "2", "3", "4", "5", "6"]) } },
      { layout: "comparison", title: "Kita vs mereka", columns: [{ heading: "Kafe", bullets: ["mahal"] }] },
      { layout: "chart", title: "Proyeksi", chart: { type: "bar", labels: ["Q1", "Q2"], series: [{ name: "Cup", values: ["150", 400] }] } },
    ],
  };
  expect(presentationSchema.safeParse(raw).success).toBe(false);
  const fixed = clampToSchema(raw, JSON_SCHEMA);
  const parsed = presentationSchema.safeParse(fixed);
  expect(parsed.success).toBe(true);
  const d = parsed.data!;
  expect(d.title.length).toBeLessThanOrEqual(90);
  expect(d.theme).toBe("midnight");
  expect(d.slides[0].bullets).toHaveLength(6);
  expect(d.slides[2].table?.headers).toHaveLength(5);
  expect(d.slides[2].table?.rows).toHaveLength(7);
  expect(d.slides[3].columns).toBeUndefined();
  expect(d.slides[4].chart?.series[0].values).toEqual([150, 400]);
});
