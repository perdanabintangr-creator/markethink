import { describe, expect, it, vi } from "vitest";
import { buildCarouselScene, carouselImageRequests, carouselSchema } from "@/lib/deck/carousel";
import { renderSlideImages } from "@/lib/deck/render-image";
import { brandVisualOf, formatBrandKit } from "@/lib/ai/prompt";
import { TEMPLATE_GROUPS, groupForRole } from "@/lib/templates";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
const { applyBrand } = await import("@/lib/ai/tools");

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const carousel = carouselSchema.parse({
  title: "Tips kopi",
  format: "4:5",
  design: { mood: "warm", kv: "cozy coffee shop" },
  slides: [
    { kind: "hook", title: "5 tanda kopi susu enak", image_prompt: "latte" },
    { kind: "list", title: "Cek ini", bullets: ["Gula aren asli", "Susu segar"] },
    { kind: "stat", title: "Konsisten", stat: { value: "38%", label: "pesan ulang" } },
    { kind: "cta", title: "Coba hari ini" },
  ],
  caption: "Kopi sore terbaik #kopi",
});

describe("carousel & poster", () => {
  it("kanvas 4:5 → JPEG 1080×1350 per slide, teks di dalam kanvas", async () => {
    const reqs = carouselImageRequests(carousel, 6);
    expect(reqs.map((r) => r.key)).toEqual(["cover"]);
    const img = { data: PNG, mime: "image/png", width: 900, height: 700 };
    const scene = buildCarouselScene(carousel, { cover: img }, { handle: "@kopi" });
    expect(scene.w).toBe(7.5);
    expect(scene.h).toBeCloseTo(9.375);
    expect(scene.slides).toHaveLength(4);
    for (const sl of scene.slides)
      for (const it of sl.items) if (it.t === "text") expect(it.y + (it.lines.length * it.size * it.lh) / 72).toBeLessThanOrEqual(scene.h + 0.01);
    const jpgs = await renderSlideImages(scene, { cover: img });
    const sharp = (await import("sharp")).default;
    const meta = await sharp(jpgs[0]).metadata();
    expect([meta.width, meta.height]).toEqual([1080, 1350]);
  }, 60_000);

  it("Free (tanpa foto AI) tetap jadi desain rapi; poster = 1 slide 9:16", () => {
    const poster = carouselSchema.parse({ ...carousel, format: "9:16", slides: [carousel.slides[0]] });
    expect(carouselImageRequests(poster, 0)).toHaveLength(0);
    const scene = buildCarouselScene(poster, {});
    expect(scene.h).toBeCloseTo(13.333);
    expect(scene.slides).toHaveLength(1);
  });
});

describe("Brand Kit", () => {
  it("warna & gaya brand menang atas pilihan AI", () => {
    const brand = brandVisualOf({ brand_name: "Kopi Senja", color_primary: "b4532a", design_mood: "warm", logo_id: "not-a-uuid" });
    expect(brand).toEqual({ name: "Kopi Senja", colorPrimary: "#B4532A", colorSecondary: undefined, logoId: undefined, mood: "warm", handle: undefined });
    const input: { brand_color?: string; design?: { mood: "tech" | "warm"; kv: string; palette?: { accent?: string } } } = { design: { mood: "tech", kv: "x" } };
    const out = applyBrand(input as Parameters<typeof applyBrand>[0], brand);
    expect(out.design?.mood).toBe("warm");
    expect(out.design?.palette?.accent).toBe("#B4532A");
    expect(out.brand_color).toBe("#B4532A");
    expect(formatBrandKit({ color_primary: "#B4532A", social_handle: "@kopisenja" })).toContain("Warna brand");
  });

  it("tanpa identitas visual → tidak mengubah apa pun", () => {
    expect(brandVisualOf({ brand_name: "X", products: "kopi" })).toBeNull();
  });
});

describe("template per peran", () => {
  it("setiap peran punya template & grup bawaan sesuai onboarding", () => {
    for (const g of TEMPLATE_GROUPS) expect(g.items.length).toBeGreaterThanOrEqual(5);
    expect(groupForRole("umkm_owner")).toBe("umkm");
    expect(groupForRole("marketing_pro")).toBe("officer");
    expect(groupForRole("freelancer")).toBe("freelancer");
    expect(groupForRole(null)).toBe("umkm");
  });
});
