import { describe, expect, it } from "vitest";
import { presentationSchema } from "@/lib/pptx";
import { buildScene, deckNeedsReference, resolvePalette, signatureImageRequests } from "@/lib/deck/engine";
import { renderScenePdf, renderScenePptx } from "@/lib/deck/render";
import { MOOD_IDS } from "@/lib/deck/moods";
import { SCENE_H, SCENE_W } from "@/lib/deck/scene";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const img = { data: PNG, mime: "image/png", width: 1600, height: 900 };

const deck = presentationSchema.parse({
  title: "Demokrat Digital Arena",
  subtitle: "Festival digital esports & video AI",
  design: { mood: "tech", palette: { bg: "#050B1F", text: "#FFFFFF", accent: "#2F7BFF", accent2: "#5CC8FF" }, kv: "night esports arena", tagline: "Play the Game. Create the Future.", presenter: "Presented by X" },
  slides: [
    { layout: "cards", title: "The Player Meets The Creator.", image_prompt: "duo", cards: [{ icon: "x", title: "Esports", text: "Energi kompetisi langsung. Menarik supporter." }, { icon: "x", title: "AI Video", text: "Produksi lebih panjang. Jangkauan online kuat." }], takeaway: "Satu arena." },
    { layout: "bullets", title: "Makna Identitas", bullets: ["Demokrat: transparan", "Digital: gaming & AI", "Arena: tempat bertanding → pengakuan 🏆"] },
    { layout: "timeline", title: "The Battle Arena", image_prompt: "stage", steps: [{ title: "Kualifikasi", text: "Live" }, { title: "Semifinal", text: "Supporter" }, { title: "Final", text: "MVP" }], source: "Internal" },
    { layout: "stats", title: "Traksi", stats: [{ value: "150", label: "cup/hari" }, { value: "45%", label: "margin" }], takeaway: "Permintaan terbukti." },
    { layout: "chart", title: "Penonton", chart: { type: "bar", labels: ["M1", "M2"], series: [{ name: "rb", values: [4, 12] }] } },
    { layout: "table", title: "Sponsor", table: { headers: ["Paket", "Nilai"], rows: [["Gold", "Rp300 jt"]] } },
    { layout: "comparison", title: "Posisi", columns: [{ heading: "Kafe", bullets: ["Mahal"] }, { heading: "Kami", bullets: ["Murah", "Cepat"] }] },
    { layout: "quote", title: "Insight", quote: "Satu panggung untuk generasi digital." },
    { layout: "closing", title: "Terima kasih", bullets: ["halo@x.id"] },
  ],
});

describe("deck Signature (Promax)", () => {
  const scene = buildScene(deck, { images: { cover: img, "0": img, "2": img } });

  it("semua elemen berada di dalam slide & teks tidak melebihi kotaknya", () => {
    expect(scene.slides).toHaveLength(deck.slides.length + 1);
    for (const sl of scene.slides) {
      for (const it of sl.items) {
        if (it.t !== "text") continue;
        expect(it.x).toBeGreaterThanOrEqual(0);
        expect(it.x + it.w).toBeLessThanOrEqual(SCENE_W + 0.01);
        expect(it.y + (it.lines.length * it.size * it.lh) / 72).toBeLessThanOrEqual(SCENE_H + 0.01);
        expect(it.lines.join("")).not.toMatch(/🏆/u); // emoji tanpa glyph dibuang
      }
    }
  });

  it("menghasilkan PPTX & PDF valid dengan font tertanam", async () => {
    const images = { cover: img, "0": img, "2": img };
    const pptx = await renderScenePptx(scene, images, deck.title);
    const pdf = await renderScenePdf(scene, images, deck.title);
    expect([...pptx.slice(0, 2)]).toEqual([0x50, 0x4b]);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(20_000); // font tertanam
  });

  it("semua mood punya font yang bisa dimuat", () => {
    for (const mood of MOOD_IDS) {
      const s = buildScene({ ...deck, design: { ...deck.design!, mood } }, { images: {} });
      expect(s.mood).toBe(mood);
    }
  });

  it("palet dikoreksi bila kontras teks terlalu rendah", () => {
    const p = resolvePalette({ theme: "midnight", design: { mood: "tech", kv: "x", palette: { bg: "#101010", text: "#202020" } } });
    expect(p.text).toBe("FFFFFF");
  });

  it("permintaan foto: KV (cover) dulu, slide 2 kartu = komposisi kiri-kanan, dibatasi kuota", () => {
    const reqs = signatureImageRequests(deck, 2);
    expect(reqs.map((r) => r.key)).toEqual(["cover", "0"]);
    expect(reqs[1].composition).toMatch(/left half/);
  });
});

describe("Signature mengikuti mood", () => {
  it("mood berbingkai (lucu): foto jadi panel samping & isi pindah ke sisi lain", () => {
    const cute = { ...deck, design: { ...deck.design!, mood: "playful" as const, image_style: "3d" as const } };
    const reqs = signatureImageRequests(cute, 8);
    expect(reqs.find((r) => r.key === "cover")?.aspect).toBe("3:4");
    expect(reqs.some((r) => r.key === "2")).toBe(false); // timeline tanpa foto di mood berbingkai
    const scene = buildScene(cute, { images: { cover: img, "0": img } });
    const title = scene.slides[1].items.find((it) => it.t === "text" && it.font === "head");
    expect(title && title.t === "text" && title.x + title.w).toBeLessThan(SCENE_W * 0.62);
  });
});

it("foto slide pakai Muse (tanpa acuan) kecuali maskot / ilustrasi lucu", () => {
  expect(deckNeedsReference({ theme: "midnight", design: { mood: "tech", kv: "x" } })).toBe(false);
  expect(deckNeedsReference({ theme: "midnight", design: { mood: "tech", kv: "x", image_style: "3d" } })).toBe(true);
  expect(deckNeedsReference({ theme: "midnight", design: { mood: "playful", kv: "x" } })).toBe(true);
  expect(deckNeedsReference({ theme: "midnight", design: { mood: "warm", kv: "x", cast: "brand mascot Popo, a round chocolate bean" } })).toBe(true);
  expect(deckNeedsReference({ theme: "midnight", design: { mood: "tech", kv: "x", cast: "Two main characters: a gamer and a creator" } })).toBe(false);
});

it("PPTX menanam font (EOT) dan memakai nama font sesuai file", async () => {
  const JSZip = (await import("jszip")).default;
  const scene = buildScene(deck, { images: {} });
  const zip = await JSZip.loadAsync(await renderScenePptx(scene, {}, deck.title));
  const pres = await zip.file("ppt/presentation.xml")!.async("string");
  expect(pres).toContain('embedTrueTypeFonts="1"');
  expect(pres).toMatch(/<p:embeddedFont><p:font typeface="Chakra Petch"[^>]*\/><p:bold r:id=/);
  const fnt = await zip.file("ppt/fonts/font1.fntdata")!.async("uint8array");
  expect(Buffer.from(fnt).readUInt16LE(34)).toBe(0x504c); // magic EOT
  const slide = await zip.file("ppt/slides/slide2.xml")!.async("string");
  expect(slide).toContain('typeface="Inter SemiBold"');
});

it("PPT tampilan persis: tiap slide jadi gambar Full HD dengan font asli", async () => {
  const { renderSlideImages, renderImagePptx, slideSvg } = await import("@/lib/deck/render-image");
  const scene = buildScene(deck, { images: { cover: img } });
  expect(slideSvg(scene.slides[0], scene, { cover: img })).toContain("<path");
  const jpgs = await renderSlideImages(scene, { cover: img });
  expect(jpgs).toHaveLength(scene.slides.length);
  expect([jpgs[0][0], jpgs[0][1]]).toEqual([0xff, 0xd8]);
  const pptx = await renderImagePptx(scene, jpgs, deck.title);
  expect([...pptx.slice(0, 2)]).toEqual([0x50, 0x4b]);
}, 60_000);
