import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { addDays, buildGeneratePrompt, formatMix, generatedWeekSchema, pickLook, planSlots, todayWib, visualPrompt } from "@/lib/autopilot/plan";
import { needsBatch } from "@/lib/autopilot/schedule";
import { brandHashtag, capHashtags, fixCaption, lintCaption, lintSlides } from "@/lib/autopilot/lint";
import { brandPalette, isHero, plainText, slideCorners, slideTheme, slidesText, type Slide } from "@/lib/autopilot/slides";
import { tidyPost } from "@/lib/autopilot/tidy";
import { autopilotAllowance, monthStartWib } from "@/lib/autopilot/quota";
import { renderSlides } from "@/lib/autopilot/render";
import { sampleSlides } from "@/lib/autopilot/samples";

describe("autopilot plan", () => {
  it("addDays & todayWib", () => {
    expect(addDays("2026-11-30", 2)).toBe("2026-12-02");
    expect(todayWib(new Date("2026-11-20T18:00:00Z"))).toBe("2026-11-21");
  });

  it("planSlots spreads posts, Sunday only last slot, skips taken", () => {
    // 2026-11-23 = Senin → 6 hari × 2 + Minggu × 1 = 13 slot
    const all = planSlots("2026-11-23", 20, ["19:00", "12:00"]);
    expect(all).toHaveLength(13);
    expect(all.filter((s) => s.date === "2026-11-29")).toEqual([{ date: "2026-11-29", time: "19:00" }]);
    const seven = planSlots("2026-11-23", 7, ["12:00", "19:00"]);
    expect(seven).toHaveLength(7);
    expect(new Set(seven.map((s) => s.date)).size).toBeGreaterThanOrEqual(6);
    const taken = planSlots("2026-11-23", 20, ["12:00"], new Set(["2026-11-23 12:00"]));
    expect(taken.some((s) => s.date === "2026-11-23")).toBe(false);
    expect(planSlots("2026-11-23", 3, ["99:00"])[0].time).toBe("19:00");
  });

  it("formatMix sums to count with at least one carousel", () => {
    for (const n of [3, 5, 7, 10, 14]) {
      const m = formatMix(n);
      expect(m.carousel + m.image + m.reel).toBe(n);
      expect(m.carousel).toBeGreaterThanOrEqual(1);
    }
    expect(formatMix(7)).toEqual({ carousel: 4, image: 2, reel: 1 });
  });

  it("prompt carries slots, brand facts rule and hashtag", () => {
    const p = buildGeneratePrompt({
      brandBlock: "- Produk: kopi susu",
      brandName: "Kopi Senja",
      handle: "@kopisenja",
      brandTag: "#KopiSenja",
      slots: [{ date: "2026-11-23", time: "12:00" }],
      mix: formatMix(1),
      recentTitles: ["Tema lama"],
      market: null,
      outcomes: null,
      focus: "promo 11.11",
      en: false,
    });
    expect(p).toContain("2026-11-23 (Senin) 12:00");
    expect(p).toContain("#KopiSenja");
    expect(p).toContain("Jangan mengarang fakta");
    expect(p).toContain("Tema lama");
    expect(p).toContain("promo 11.11");
  });

  it("needsBatch keeps weekly ±4 days and monthly ±21 days ahead", () => {
    expect(needsBatch("weekly", null, "2026-11-20")).toBe(true);
    expect(needsBatch("weekly", "2026-11-23", "2026-11-20")).toBe(true);
    expect(needsBatch("weekly", "2026-11-26", "2026-11-20")).toBe(false);
    expect(needsBatch("monthly", "2026-11-30", "2026-11-20")).toBe(true);
    expect(needsBatch("monthly", "2026-12-12", "2026-11-20")).toBe(false);
  });
});

describe("autopilot quota", () => {
  it("only Pro, Promax and admin", () => {
    expect(autopilotAllowance("pro")).toEqual({ postsPerWeek: 7, postsPerMonth: 30 });
    expect(autopilotAllowance("promax")?.postsPerWeek).toBe(14);
    expect(autopilotAllowance("starter")).toBeNull();
    expect(autopilotAllowance("beta")).toBeNull();
    expect(autopilotAllowance("beta", "admin")).not.toBeNull();
  });
  it("month start in WIB", () => {
    expect(monthStartWib(new Date("2026-11-30T18:00:00Z")).toISOString()).toBe("2026-11-30T17:00:00.000Z");
    expect(monthStartWib(new Date("2026-11-20T03:00:00Z")).toISOString()).toBe("2026-10-31T17:00:00.000Z");
  });
});

describe("autopilot lint", () => {
  it("fixCaption removes AI tells", () => {
    expect(fixCaption("Halo — dunia​ “kutip”…")).toBe('Halo, dunia "kutip"...');
  });
  it("brandHashtag", () => {
    expect(brandHashtag("Kopi Senja!")).toBe("#KopiSenja");
    expect(brandHashtag("")).toBe("");
  });
  it("capHashtags keeps brand tag and max 5", () => {
    const out = capHashtags("Isi\n#a #b #fyp #c #d #e #KopiSenja", "#KopiSenja");
    const tags = out.match(/#\w+/g)!;
    expect(tags.length).toBe(5);
    expect(tags).toContain("#KopiSenja");
    expect(tags).not.toContain("#fyp");
  });
  it("lintCaption fails and warns", () => {
    const bad = lintCaption("#promo Halo semua — cek https://x.com", { brandName: "Kopi Senja" });
    expect(bad.fails.length).toBeGreaterThanOrEqual(3);
    const good = lintCaption("Kopi susu kamu terlalu manis? Ini takaran yang pas buat pagi.\n\nSimpan dulu biar nggak lupa.\n\n#kopisusu #kopipagi #KopiSenja", {
      brandName: "Kopi Senja",
      keywords: ["kopi susu"],
    });
    expect(good.fails).toEqual([]);
  });
  it("lintSlides", () => {
    expect(lintSlides([], "carousel").fails.length).toBe(1);
    expect(lintSlides([], "reel").fails).toEqual([]);
    const long: Slide = { type: "point", title: "a", body: Array(30).fill("kata").join(" ") };
    expect(lintSlides([long], "image").fails[0]).toContain("maks 25");
  });
});

describe("autopilot tidyPost", () => {
  const base = generatedWeekSchema.parse({
    posts: [
      {
        date: "2026-11-23",
        time: "12:00",
        kind: "image",
        title: "Tes",
        slides: [
          { type: "statement", title: "Satu" },
          { type: "statement", title: "Dua" },
        ],
        caption: "Kopi pagi — tanpa gula? Coba ini.\n\nKomen pilihan kamu.\n\n#kopi #kopipagi",
      },
    ],
  }).posts[0];
  it("image keeps one slide, adds brand hashtag, cleans dash", () => {
    const t = tidyPost(base, "Kopi Senja", []);
    expect(t.slides).toHaveLength(1);
    expect(t.caption).toContain("#KopiSenja");
    expect(t.caption).not.toContain("—");
    expect(t.script).toBeNull();
  });
  it("reel without script fails lint", () => {
    const t = tidyPost({ ...base, kind: "reel" }, "Kopi Senja", []);
    expect(t.slides).toEqual([]);
    expect(t.lint.fails).toContain("Naskah Reel belum ada.");
  });
});

describe("autopilot slides & render", () => {
  it("palette defaults to Marqthink and derives brand tones", () => {
    const m = brandPalette({ name: "Marqthink", handle: "marqthink.ai" });
    expect(m).toMatchObject({ royal: "#0A3DFF", cyan: "#00E5FF", blue: "#0A84FF", handle: "@marqthink.ai" });
    const k = brandPalette({ name: "Kopi", handle: "https://instagram.com/kopisenja/", primary: "7a3e1d" });
    expect(k.royal).toBe("#7A3E1D");
    expect(k.handle).toBe("@kopisenja");
    expect(k.cyan).toMatch(/^#[0-9A-F]{6}$/);
  });
  it("theme & corners", () => {
    const s: Slide = { type: "point" };
    expect(slideTheme(s, 0, 5)).toBe("dark");
    expect(slideTheme(s, 2, 5)).toBe("light");
    expect(slideCorners(s, 1, 5)).toEqual({ tag: "2/5", cta: "Geser →" });
    expect(slideCorners(s, 4, 5).cta).toBe("");
  });
  it("renders 1080×1350 JPEGs with brand colours", async () => {
    const jpgs = await renderSlides(sampleSlides(), { brand: brandPalette({ name: "Kopi Senja", primary: "#7A3E1D", secondary: "#E9A13B" }) });
    expect(jpgs).toHaveLength(4);
    const meta = await sharp(jpgs[0]).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1080, 1350, "jpeg"]);
  }, 60_000);
});

describe("autopilot studio looks", () => {
  it("visualPrompt forbids text and matches background per look", () => {
    const c = { primary: "#0A3DFF", accent: "#00E5FF" };
    expect(visualPrompt("glossy", "a coffee cup", c)).toMatch(/lavender-white background/);
    expect(visualPrompt("bold", "a coffee cup", c)).toMatch(/pure black background/);
    expect(visualPrompt("photo", "a barista", c)).toMatch(/photograph/);
    for (const l of ["glossy", "bold", "photo"] as const) expect(visualPrompt(l, "x", c)).toMatch(/no text/i);
  });
  it("pickLook honours setting, AI choice, rotation; reels stay classic", () => {
    expect(pickLook("bold", "glossy", 0, "carousel")).toBe("bold");
    expect(pickLook("auto", "photo", 0, "image")).toBe("photo");
    expect([0, 1, 2].map((k) => pickLook("auto", undefined, k, "carousel"))).toEqual(["glossy", "bold", "photo"]);
    expect(pickLook("glossy", "glossy", 0, "reel")).toBe("classic");
  });
  it("themes & hero detection", () => {
    const c: Slide = { type: "cover" };
    expect(isHero(c, 0)).toBe(true);
    expect(isHero({ type: "point" }, 0)).toBe(false);
    expect(slideTheme(c, 0, 5, "glossy")).toBe("light");
    expect(slideTheme({ type: "point" }, 2, 5, "bold")).toBe("dark");
    expect(slideTheme(c, 0, 5, "photo")).toBe("dark");
    expect(slideTheme({ type: "list" }, 3, 5, "photo")).toBe("light");
  });
  it("serif markers are stripped for plain text", () => {
    expect(plainText("Aku *hapus* semua")).toBe("Aku hapus semua");
    expect(slidesText([{ type: "cover", title: "Cek *ini*" }])).toContain("Cek ini");
  });
  it("tidyPost never keeps an image path from AI output", () => {
    const p = generatedWeekSchema.parse({
      posts: [{ date: "2026-11-23", time: "12:00", kind: "image", title: "x", caption: "Kopi pagi? Komen ya.\n\n#kopi #pagi #KopiSenja", slides: [{ type: "cover", title: "a", image: "other-user/secret.png", visual: "cup" }] }],
    }).posts[0];
    const t = tidyPost(p, "Kopi Senja", []);
    expect(t.slides[0].image).toBeUndefined();
    expect(t.slides[0].visual).toBe("cup");
  });
  it("renders every look at 1080×1350, with and without a visual", async () => {
    const hero = await sharp({ create: { width: 600, height: 600, channels: 3, background: "#3366ff" } }).png().toBuffer();
    const slides: Slide[] = [{ ...sampleSlides()[0], image: "u/autopilot/p/v.png", num: "5" }, ...sampleSlides().slice(1)];
    for (const look of ["glossy", "bold", "photo", "classic"] as const) {
      for (const images of [{ "u/autopilot/p/v.png": hero }, {}] as Record<string, Buffer>[]) {
        const out = await renderSlides(slides, { brand: brandPalette({ name: "Kopi Senja", primary: "#7A3E1D" }), look, images });
        expect(out).toHaveLength(4);
        const m = await sharp(out[0]).metadata();
        expect([m.width, m.height]).toEqual([1080, 1350]);
      }
    }
  }, 120_000);
});

