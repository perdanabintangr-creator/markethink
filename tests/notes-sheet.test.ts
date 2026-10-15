import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { notesSheet, withNotes, makeWorkbook } = await import("@/lib/addons/runtime");

const notes = "### Photomatics\n- Harga reguler **Rp29.000–38.000** [1]\n- Frame kolab Sal Priadi [2][1]\n\n### Belum ditemukan\n- Promo aktif Stulokal";
const sources = [
  { title: "A", url: "https://a.id" },
  { title: "B", url: "https://b.id" },
];

describe("sheet Excel 'Temuan riset'", () => {
  it("memecah catatan per topik & mengganti [n] dengan URL sumber", () => {
    const s = notesSheet(notes, sources);
    expect(s.name).toBe("Temuan riset");
    expect(s.rows).toEqual([
      { topic: "Photomatics", finding: "Harga reguler Rp29.000–38.000", source: "https://a.id" },
      { topic: "Photomatics", finding: "Frame kolab Sal Priadi", source: "https://b.id\nhttps://a.id" },
      { topic: "Belum ditemukan", finding: "Promo aktif Stulokal", source: "" },
    ]);
  });

  it("hanya ditambahkan bila ada riset & file Excel tetap valid", async () => {
    const base = [{ name: "Data", columns: [{ header: "X", key: "x" }], rows: [{ x: 1 }] }];
    const ctx = { admin: {} as never, userId: "u", runId: "r", cost: { usd: 0, model: null } };
    expect(withNotes(ctx, base)).toHaveLength(1);
    const sheets = withNotes({ ...ctx, researchNotes: notes, researchSources: sources }, base);
    expect(sheets.map((s) => s.name)).toEqual(["Data", "Temuan riset"]);
    const bytes = await makeWorkbook(sheets);
    expect(bytes[0]).toBe(0x50);
  });
});
