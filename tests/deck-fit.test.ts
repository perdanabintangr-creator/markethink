import { expect, it } from "vitest";
import { fitDeckToImages } from "@/lib/deck-fit";
import { buildPresentation, presentationSchema } from "@/lib/pptx";

const deck = presentationSchema.parse({
  title: "Deck",
  cover_image_prompt: "cover",
  slides: [
    { layout: "image_text", title: "A", bullets: ["x"], image_prompt: "a" },
    { layout: "product", title: "B", image_prompt: "b", cards: [{ icon: "star", title: "1", text: "t" }, { icon: "star", title: "2", text: "t" }] },
    { layout: "gallery", title: "C", gallery: [{ caption: "Satu", image_prompt: "c1" }, { caption: "Dua", image_prompt: "c2" }] },
    { layout: "bullets", title: "D", bullets: ["y"], image_prompt: "d" },
  ],
});

it("tanpa foto (Free): layout foto jadi layout teks, prompt foto dibuang", async () => {
  const f = fitDeckToImages(deck, () => false);
  expect(f.slides.map((s) => s.layout)).toEqual(["bullets", "cards", "cards", "bullets"]);
  expect(f.slides.every((s) => !s.image_prompt)).toBe(true);
  expect(f.slides[2].cards?.map((c) => c.title)).toEqual(["Satu", "Dua"]);
  expect(f.cover_image_prompt).toBeUndefined();
  expect((await buildPresentation(f)).byteLength).toBeGreaterThan(10_000);
});

it("hanya cover berfoto (Starter): cover tetap, slide lain teks", () => {
  const f = fitDeckToImages(deck, (k) => k === "cover");
  expect(f.cover_image_prompt).toBe("cover");
  expect(f.slides[0].layout).toBe("bullets");
});

it("semua foto ada (Pro): deck tidak berubah", () => {
  const f = fitDeckToImages(deck, () => true);
  expect(f.slides.map((s) => s.layout)).toEqual(["image_text", "product", "gallery", "bullets"]);
});
