import { describe, expect, it } from "vitest";
import { parseMarkdownTables, tablesToCsv } from "@/lib/export";
import { chunkText } from "@/lib/ai/chunk";

const md = `# Kalender

| Tanggal | Platform | Topik |
|---|---|---|
| 1 Nov | IG | **Promo**, gratis ongkir |
| 2 Nov | TikTok | Tips "kopi" |

Teks lain

| Tanggal | Platform | Topik |
|---|---|---|
| 8 Nov | IG | Behind the scene |
`;

describe("export", () => {
  it("parse tabel markdown", () => {
    const tables = parseMarkdownTables(md);
    expect(tables).toHaveLength(2);
    expect(tables[0][1]).toEqual(["1 Nov", "IG", "Promo, gratis ongkir"]);
  });

  it("CSV menggabungkan tabel dengan header sama & escape", () => {
    const csv = tablesToCsv(md)!;
    const lines = csv.replace("﻿", "").split("\r\n");
    expect(lines[0]).toBe("Tanggal,Platform,Topik");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe('1 Nov,IG,"Promo, gratis ongkir"');
    expect(lines[2]).toBe('2 Nov,TikTok,"Tips ""kopi"""');
  });

  it("tanpa tabel → null", () => {
    expect(tablesToCsv("halo")).toBeNull();
  });
});

describe("chunkText", () => {
  it("teks pendek satu chunk", () => {
    expect(chunkText("halo dunia")).toEqual(["halo dunia"]);
  });
  it("teks panjang dipecah dengan overlap & tidak kosong", () => {
    const text = Array.from({ length: 200 }, (_, i) => `Kalimat nomor ${i} tentang strategi marketing.`).join(" ");
    const chunks = chunkText(text, 500, 50);
    expect(chunks.length).toBeGreaterThan(5);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(500);
    expect(chunks.join(" ")).toContain("Kalimat nomor 199");
  });
});
