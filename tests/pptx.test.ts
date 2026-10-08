import { describe, expect, it } from "vitest";
import { buildPresentation, deckImageRequests, imageSize, presentationOutline, presentationSchema } from "@/lib/pptx";
import { extractText } from "@/lib/files";
import { textBlocks } from "@/lib/message-text";

const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

describe("pembuat PPT", () => {
  const input = presentationSchema.parse({
    title: "Strategi Ramadan Glowa",
    subtitle: "Q1 2027",
    theme: "sunset",
    brand_color: "#E11D48",
    cover_image_prompt: "skincare flatlay",
    slides: [
      { layout: "agenda", title: "Agenda", bullets: ["Insight", "Strategi", "Eksekusi"] },
      { layout: "section", title: "Insight", image_prompt: "woman" },
      { layout: "cards", title: "Tiga pilar", cards: [{ icon: "heart", title: "Edukasi", text: "Konten kulit sehat" }, { icon: "ikon-tak-dikenal", title: "UGC", text: "Review pelanggan" }] },
      { layout: "stats", title: "Target", stats: [{ value: "2x", label: "ROAS" }, { value: "10K", label: "Follower" }], bullets: ["Fokus TikTok"] },
      { layout: "chart", title: "Penjualan", chart: { type: "bar", labels: ["Jan", "Feb"], series: [{ name: "Unit", values: [10, 20] }] }, bullets: ["Naik 2x"] },
      { layout: "timeline", title: "Jadwal", steps: [{ title: "M1", text: "Teaser" }, { title: "M2", text: "Launch" }, { title: "M3", text: "Sustain" }] },
      { layout: "comparison", title: "Sebelum vs Sesudah", columns: [{ heading: "Sebelum", bullets: ["A"] }, { heading: "Sesudah", bullets: ["B"] }] },
      { layout: "table", title: "Budget", table: { headers: ["Item", "Rp"], rows: [["Ads", "5 jt"]] } },
      { layout: "quote", title: "Pelanggan", quote: "Glowa bikin kulitku sehat" },
      { layout: "bullets", title: "Masalah", bullets: ["CAC naik 30%"], notes: "Tekankan angka CAC" },
      { layout: "closing", title: "Terima kasih", bullets: ["hello@glowa.id"] },
    ],
  });

  it("menghasilkan file .pptx valid (semua layout) yang teksnya bisa dibaca ulang", async () => {
    const bytes = await buildPresentation(input);
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]); // zip
    const text = await extractText(PPTX, bytes);
    for (const s of ["Strategi Ramadan Glowa", "CAC naik 30%", "Glowa bikin kulitku sehat", "Tekankan angka CAC", "Review pelanggan", "Launch"]) {
      expect(text).toContain(s);
    }
  });

  it("permintaan gambar deck: cover + slide bergambar", () => {
    expect(deckImageRequests(input).map((r) => r.key)).toEqual(["cover", "1"]);
  });

  it("foto milik user selalu dipakai; gambar AI dibatasi & diprioritaskan (produk dulu)", () => {
    const deck = presentationSchema.parse({
      title: "Deck",
      cover_image_id: "11111111-1111-1111-1111-111111111111",
      slides: [
        { layout: "cards", title: "A", image_prompt: "a", cards: [{ icon: "star", title: "x", text: "y" }, { icon: "star", title: "x", text: "y" }] },
        { layout: "product", title: "Produk", image_prompt: "bottle" },
        { layout: "gallery", title: "G", gallery: [{ caption: "1", image_prompt: "p" }, { caption: "2", image_id: "22222222-2222-2222-2222-222222222222" }] },
      ],
    });
    const reqs = deckImageRequests(deck, 2);
    expect(reqs.filter((r) => r.imageId).map((r) => r.key)).toEqual(["cover", "2-g1"]);
    expect(reqs.filter((r) => r.prompt).map((r) => r.key)).toEqual(["1", "2-g0"]);
    expect(reqs.find((r) => r.key === "1")?.product).toBe(true);
    expect(deckImageRequests(deck, 0).every((r) => r.imageId)).toBe(true);
  });

  it("outline berisi semua judul slide", () => {
    const outline = presentationOutline(input);
    expect(outline).toContain("Sebelum vs Sesudah");
    expect(outline).toContain("2x — ROAS");
  });

  it("ukuran gambar PNG terbaca", () => {
    const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAAC56t6BAAAAEklEQVR4nGP4z8DwnwEJMCBzAEDgB/kRgf8yAAAAAElFTkSuQmCC", "base64"));
    expect(imageSize(png)).toEqual({ width: 2, height: 3 });
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
