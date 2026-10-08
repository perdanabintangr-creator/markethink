import { describe, expect, it } from "vitest";
import { buildPresentation, presentationOutline, presentationSchema } from "@/lib/pptx";
import { extractText } from "@/lib/files";
import { textBlocks } from "@/lib/message-text";

const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

describe("pembuat PPT", () => {
  const input = presentationSchema.parse({
    title: "Strategi Ramadan Glowa",
    subtitle: "Q1 2027",
    slides: [
      { layout: "section", title: "Insight" },
      { title: "Masalah", bullets: ["CAC naik 30%", "Engagement turun"], notes: "Tekankan angka CAC" },
      { layout: "two_column", title: "Sebelum vs Sesudah", columns: [{ heading: "Sebelum", bullets: ["A"] }, { heading: "Sesudah", bullets: ["B"] }] },
      { layout: "stats", title: "Target", stats: [{ value: "2x", label: "ROAS" }, { value: "10K", label: "Follower" }] },
      { layout: "quote", title: "Pelanggan", quote: "Glowa bikin kulitku sehat" },
      { layout: "closing", title: "Next step", bullets: ["Mulai minggu depan"] },
    ],
  });

  it("menghasilkan file .pptx valid yang teksnya bisa dibaca ulang", async () => {
    const bytes = await buildPresentation(input);
    expect(bytes.byteLength).toBeGreaterThan(10_000);
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]); // zip
    const text = await extractText(PPTX, bytes);
    expect(text).toContain("Strategi Ramadan Glowa");
    expect(text).toContain("CAC naik 30%");
    expect(text).toContain("Glowa bikin kulitku sehat");
    expect(text).toContain("Tekankan angka CAC");
  });

  it("outline berisi semua judul slide", () => {
    const outline = presentationOutline(input);
    expect(outline).toContain("Sebelum vs Sesudah");
    expect(outline).toContain("2x — ROAS");
  });
});

describe("penggabungan teks jawaban", () => {
  it("potongan teks bersebelahan (sitasi Claude) disambung, tool memutus blok", () => {
    const blocks = textBlocks([
      { type: "text", text: "Photobebaz adalah " },
      { type: "source-url" },
      { type: "text", text: "studio foto di Jakarta." },
      { type: "tool-generate_image" },
      { type: "text", text: "Ini gambarnya." },
    ]);
    expect(blocks).toEqual(["Photobebaz adalah studio foto di Jakarta.", "Ini gambarnya."]);
  });
});
