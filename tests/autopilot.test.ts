import { buildDirectorPrompt, finalImagePrompt, postPlanSchema, selectJobs } from "@/lib/autopilot/director";
import { dedupeAccent } from "@/lib/autopilot/tidy";
import { slideVisualPromptFor } from "@/lib/autopilot/style";
import { SLIDE_SPEC } from "@/lib/autopilot/plan";
import { mergeIntoKit, researchPrompt, researchSchema, visualSubjectsBlock } from "@/lib/autopilot/research-shape";
import { mixFor, pillarCounts, strategyBlock } from "@/lib/autopilot/strategy";
import { buildTeamReviewPrompt, mergeFixedSlides, reviewSchema } from "@/lib/autopilot/review";
import { catalogBlock, productInput, productVisualPrompt, rotateProducts, type ProductRow } from "@/lib/autopilot/products";
import { INDUSTRY_SAMPLES, PRESET_VISUALS } from "@/lib/autopilot/preset-samples";
import { analyzePrompt } from "@/lib/autopilot/style-prompt";
import { baseOf, dnaForLook, imageAspectFor, LOOK_DNA, parseDna, styleDnaSchema, styleNote, visualPromptFor } from "@/lib/autopilot/style";
import { INDUSTRIES, presetById, presetsFor, STYLE_PRESETS } from "@/lib/autopilot/presets";
import { engagementScore, summarizePerformance, type MediaStat } from "@/lib/autopilot/performance";
import { brandKeywordsOf, forbiddenHits, splitList, voiceRules } from "@/lib/autopilot/voice";
import { createHmac } from "node:crypto";
import { canPublish, cleanIgCode, decryptToken, encryptToken, igAuthorizeUrl, igErrorText, insightValues, isDue, parseSignedRequest, tokenKey } from "@/lib/instagram-core";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { addDays, buildGeneratePrompt, buildIdeasPrompt, formatMix, generatedWeekSchema, ideasWeekSchema, pickLook, planSlots, todayWib, visualPrompt } from "@/lib/autopilot/plan";
import { needsBatch } from "@/lib/autopilot/schedule";
import { brandHashtag, capHashtags, fixCaption, lintCaption, lintSlides } from "@/lib/autopilot/lint";
import { brandPalette, isHero, plainText, slideCorners, slideTheme, slidesText, type Slide } from "@/lib/autopilot/slides";
import { tidyPost } from "@/lib/autopilot/tidy";
import { CONTENT_PLANS, isComboId, isContentPlanId, monthStartWib, splitCombo } from "@/lib/autopilot/quota";
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
    expect(formatMix(7)).toEqual({ carousel: 3, image: 3, reel: 1 });
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
  it("paket Autopilot Konten: Lite/Pro/Bisnis", () => {
    expect(CONTENT_PLANS.konten_lite).toMatchObject({ price: 149_000, postsPerWeek: 3, postsPerMonth: 12, innerVisuals: 2 });
    expect(CONTENT_PLANS.konten_pro).toMatchObject({ price: 249_000, postsPerWeek: 5, postsPerMonth: 20 });
    expect(CONTENT_PLANS.konten_bisnis).toMatchObject({ price: 499_000, postsPerWeek: 10, postsPerMonth: 40, innerVisuals: 4 });
    expect(isContentPlanId("konten_pro")).toBe(true);
    expect(isContentPlanId("pro")).toBe(false);
    expect(isComboId("combo_pro_konten")).toBe(true);
    expect(isComboId("pro")).toBe(false);
  });
  it("bundel dibagi proporsional dan jumlahnya pas", () => {
    const parts = splitCombo(399_000, [
      { id: "pro", list: 200_000 },
      { id: "konten_pro", list: 249_000 },
    ]);
    expect(parts[0]).toEqual({ id: "pro", amount: 177_728 });
    expect(parts[0].amount + parts[1].amount).toBe(399_000);
    expect(splitCombo(100, [{ id: "a", list: 0 }, { id: "b", list: 0 }]).reduce((a, p) => a + p.amount, 0)).toBe(100);
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


describe("instagram core", () => {
  it("authorize url carries scopes, state and redirect", () => {
    const u = new URL(igAuthorizeUrl({ appId: "123", redirectUri: "https://marqthink.com/api/instagram/callback", state: "abc" }));
    expect(u.host).toBe("www.instagram.com");
    expect(u.searchParams.get("scope")).toBe("instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights");
    expect(u.searchParams.get("state")).toBe("abc");
    expect(cleanIgCode("xyz#_")).toBe("xyz");
  });
  it("token encryption round-trips and rejects tampering", () => {
    const k = tokenKey("secret");
    const sealed = encryptToken("IGQV-token", k);
    expect(sealed).not.toContain("IGQV");
    expect(decryptToken(sealed, k)).toBe("IGQV-token");
    expect(() => decryptToken(sealed, tokenKey("other"))).toThrow();
  });
  it("signed_request is verified with the app secret", () => {
    const payload = Buffer.from(JSON.stringify({ algorithm: "HMAC-SHA256", user_id: "999" })).toString("base64url");
    const sig = createHmac("sha256", "appsecret").update(payload).digest("base64url");
    expect(parseSignedRequest(`${sig}.${payload}`, "appsecret")?.user_id).toBe("999");
    expect(parseSignedRequest(`${sig}.${payload}`, "wrong")).toBeNull();
    expect(parseSignedRequest("garbage", "appsecret")).toBeNull();
  });
  it("isDue respects WIB time and grace window", () => {
    const now = new Date("2026-11-21T05:00:00Z"); // 12:00 WIB
    expect(isDue("2026-11-21", "12:00", now)).toBe(true);
    expect(isDue("2026-11-21", "19:00", now)).toBe(false);
    expect(isDue("2026-11-19", "19:00", now)).toBe(true);
    expect(isDue("2026-11-15", "19:00", now)).toBe(false);
  });
  it("account types & friendly errors", () => {
    expect(canPublish("BUSINESS")).toBe(true);
    expect(canPublish("MEDIA_CREATOR")).toBe(true);
    expect(canPublish("PERSONAL")).toBe(false);
    expect(igErrorText('{"code":190,"message":"Error validating access token"}')).toMatch(/Hubungkan ulang/);
  });
});

describe("autopilot performance learning", () => {
  const base = { posted_at: "2026-11-15T05:00:00Z", caption: "x", likes: 0, comments: 0, reach: 0, saved: 0, shares: 0 };
  const rows: MediaStat[] = [
    { ...base, ig_media_id: "1", media_type: "CAROUSEL_ALBUM", caption: "Takaran gula aren yang pas\nisi", reach: 3000, saved: 120, shares: 40, likes: 200, comments: 30 },
    { ...base, ig_media_id: "2", media_type: "CAROUSEL_ALBUM", caption: "Cara seduh kopi susu", reach: 2000, saved: 80, shares: 20, likes: 150, comments: 10 },
    { ...base, ig_media_id: "3", media_type: "IMAGE", caption: "Selamat pagi", reach: 400, saved: 1, likes: 20 },
    { ...base, ig_media_id: "4", media_type: "IMAGE", caption: "Promo hari ini", reach: 300, likes: 10 },
  ];
  it("ranks by saves/shares and finds the strongest format", () => {
    expect(engagementScore(rows[0])).toBeGreaterThan(engagementScore(rows[2]));
    const s = summarizePerformance(rows, new Date("2026-11-20T00:00:00Z"))!;
    expect(s).toContain("Takaran gula aren yang pas");
    expect(s).toMatch(/Format paling kuat: carousel/);
    expect(s).toContain("Terlemah");
  });
  it("needs at least 3 recent posts", () => {
    expect(summarizePerformance(rows.slice(0, 2), new Date("2026-11-20T00:00:00Z"))).toBeNull();
    expect(summarizePerformance(rows, new Date("2027-02-01T00:00:00Z"))).toBeNull();
  });
  it("parses insight values in both formats", () => {
    expect(insightValues([{ name: "reach", values: [{ value: 10 }] }, { name: "saved", total_value: { value: 3 } }])).toEqual({ reach: 10, saved: 3 });
  });
});

describe("brand voice", () => {
  const kit = { voice_dont: "termurah, dijamin\nAnda", seo_keywords: "kopi susu gula aren, kopi Bandung", brand_lines: "Kopi Senja adalah kedai kopi.", caption_examples: "Contoh caption" };
  it("lists, keywords & rules", () => {
    expect(splitList("a, bb; cc\n- dd")).toEqual(["bb", "cc", "dd"]);
    expect(brandKeywordsOf(kit)).toEqual(["kopi susu gula aren", "kopi Bandung"]);
    expect(brandKeywordsOf({ products: "Kopi susu literan, roti bakar" })).toEqual(["Kopi susu", "roti bakar"]);
    const r = voiceRules(kit)!;
    expect(r).toContain('"termurah"');
    expect(r).toContain("Kopi Senja adalah kedai kopi.");
    expect(voiceRules({})).toBeNull();
  });
  it("forbidden words fail the linter (whole words only)", () => {
    expect(forbiddenHits("Kopi termurah se-Bandung", kit.voice_dont)).toEqual(["termurah"]);
    expect(forbiddenHits("Kopi termurahnya", kit.voice_dont)).toEqual([]);
    const l = lintCaption("Kopi susu gula aren termurah! Simpan ya.\n\n#kopi #kopisusu #KopiSenja", { forbidden: kit.voice_dont });
    expect(l.fails.some((f) => f.includes("termurah"))).toBe(true);
    expect(lintSlides([{ type: "cover", title: "Dijamin enak" }], "image", kit.voice_dont).fails.length).toBe(1);
  });
  it("prompt includes performance & voice blocks", () => {
    const p = buildGeneratePrompt({ brandBlock: "", brandName: "K", handle: "", brandTag: "#K", slots: [{ date: "2026-11-23", time: "12:00" }], mix: formatMix(1), recentTitles: [], market: null, outcomes: null, focus: null, en: false, performance: "PERFORMA X", voice: "SUARA BRAND Y" });
    expect(p).toContain("PERFORMA X");
    expect(p).toContain("SUARA BRAND Y");
  });
});

describe("style DNA", () => {
  it("every industry preset is a valid DNA and industries have 3 styles", () => {
    for (const p of STYLE_PRESETS) expect(styleDnaSchema.safeParse(p.dna).success, p.id).toBe(true);
    // 3 gaya studio + 1–2 template sosmed UMKM per industri.
    for (const ind of INDUSTRIES) {
      expect(presetsFor(ind.id).filter((p) => p.dna.layout !== "sosmed")).toHaveLength(3);
      expect(presetsFor(ind.id).some((p) => p.dna.layout === "sosmed")).toBe(true);
    }
    expect(new Set(STYLE_PRESETS.map((p) => p.id)).size).toBe(STYLE_PRESETS.length);
  });
  it("baseOf maps DNA to the design column", () => {
    expect(baseOf(LOOK_DNA.glossy)).toBe("glossy");
    expect(baseOf(LOOK_DNA.bold)).toBe("bold");
    expect(baseOf(LOOK_DNA.photo)).toBe("photo");
    expect(baseOf(presetById("fnb-warm")!.dna)).toBe("glossy");
    expect(dnaForLook("classic")).toBeNull();
  });
  it("visual prompt matches the background and keeps no-text rule", () => {
    const c = { primary: "#7A3E1D", accent: "#E9A13B" };
    expect(visualPromptFor(presetById("fnb-warm")!.dna, "a latte", c)).toMatch(/cream/);
    expect(visualPromptFor(presetById("fnb-bold")!.dna, "a burger", c)).toMatch(/pure black/);
    expect(visualPromptFor(presetById("fnb-photo")!.dna, "friends", c)).toMatch(/Portrait 3:4/);
    expect(imageAspectFor(presetById("fnb-photo")!.dna)).toBe("3:4");
    expect(visualPromptFor(presetById("retail-promo")!.dna, "x", c)).toMatch(/no text/i);
  });
  it("parseDna rejects junk and styleNote describes the style", () => {
    expect(parseDna({ bg: "neon" })).toBeNull();
    expect(parseDna(presetById("tech-grid")!.dna)?.font).toBe("space");
    expect(styleNote(presetById("education-glossy")!.dna)).toMatch(/corners/);
  });
  it("analysis prompt lists every allowed value and feedback", () => {
    const p = analyzePrompt({ count: 4, feedback: "lebih elegan", previous: LOOK_DNA.bold });
    for (const f of ["anton", "cormorant", "fredoka"]) expect(p).toContain(f);
    expect(p).toContain("lebih elegan");
    expect(p).toContain("Jangan menyalin logo");
  });
  it("renders presets with and without visuals", async () => {
    const hero = await sharp({ create: { width: 500, height: 500, channels: 3, background: "#ffaa33" } }).png().toBuffer();
    const slides: Slide[] = [{ ...sampleSlides()[0], label: "tips", image: "u/autopilot/p/v.png" }, ...sampleSlides().slice(1, 3)];
    for (const id of ["fnb-warm", "fashion-street", "education-board", "retail-promo", "property-premium", "beauty-model"]) {
      const dna = presetById(id)!.dna;
      const out = await renderSlides(slides, { brand: brandPalette({ name: "Kopi Senja", primary: "#7A3E1D" }), look: baseOf(dna), style: dna, images: { "u/autopilot/p/v.png": hero } });
      expect((await sharp(out[0]).metadata()).height).toBe(1350);
    }
  }, 120_000);
});

describe("industry samples", () => {
  it("every preset has a sample visual and every industry a 3-slide sample in both languages", () => {
    for (const p of STYLE_PRESETS) expect(PRESET_VISUALS[p.id], p.id).toBeTruthy();
    for (const ind of INDUSTRIES) {
      for (const l of ["id", "en"] as const) {
        const trio = INDUSTRY_SAMPLES[ind.id][l];
        expect(trio.map((s) => s.type)).toEqual(["cover", "point", "list"]);
        expect(lintSlides(trio, "carousel").fails).toEqual([]);
      }
    }
  });
});

describe("product catalog", () => {
  const prods: ProductRow[] = [
    { id: "a", name: "Keripik Pedas", sku: "KP-01", price: "Rp15.000", description: "Renyah", photo_paths: ["u/x.jpg"], active: true },
    { id: "b", name: "Keripik Original", sku: null, price: null, description: null, photo_paths: [], active: true },
    { id: "c", name: "Makaroni", sku: null, price: null, description: null, photo_paths: [], active: false },
  ];
  it("rotates least-featured products first", () => {
    const f = new Map([["a", { n: 3, last: "2026-11-20" }]]);
    expect(rotateProducts(prods, f).map((p) => p.id)).toEqual(["b", "c", "a"]);
    const f2 = new Map([["a", { n: 1, last: "2026-11-01" }], ["b", { n: 1, last: "2026-11-19" }]]);
    expect(rotateProducts(prods.slice(0, 2), f2).map((p) => p.id)).toEqual(["a", "b"]);
  });
  it("catalog block lists active products with ids and rules", () => {
    const c = catalogBlock(prods, new Map())!;
    expect(c).toContain("id=a | Keripik Pedas (SKU KP-01) | harga Rp15.000");
    expect(c).not.toContain("Makaroni");
    expect(c).toContain("product_id");
    expect(catalogBlock([], new Map())).toBeNull();
  });
  it("product visual prompt keeps the real product", () => {
    const p = productVisualPrompt(presetById("retail-product")!.dna, { name: "Keripik Pedas" }, "on a podium");
    expect(p).toContain("Keep THE EXACT product");
    expect(p).toContain("cream");
    expect(productInput.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("strategy, ideas & senior review", () => {
  it("goal mixes sum to 100 and counts sum to n", () => {
    for (const g of ["balanced", "awareness", "engagement", "sales"]) {
      const m = mixFor(g);
      expect(m.edukasi + m.relatable + m.insight + m.produk).toBe(100);
      for (const n of [3, 7, 14]) {
        const c = pillarCounts(n, m);
        expect(c.edukasi + c.relatable + c.insight + c.produk).toBe(n);
      }
    }
    expect(pillarCounts(7, mixFor("sales")).produk).toBeGreaterThanOrEqual(3);
    expect(mixFor("custom", { edukasi: 1, relatable: 1, insight: 0, produk: 2 })).toEqual({ edukasi: 25, relatable: 25, insight: 0, produk: 50 });
    expect(mixFor("custom", null)).toEqual(mixFor("balanced"));
    expect(pillarCounts(4, { edukasi: 0, relatable: 0, insight: 0, produk: 100 }).produk).toBe(4);
  });
  it("strategy block states exact counts", () => {
    const b = strategyBlock("engagement", null, 7);
    expect(b).toMatch(/total 7 post/);
    expect(b).toMatch(/Relatable/);
  });
  it("ideas prompt and writer prompt with ideas", () => {
    const base = { brandBlock: "", brandName: "K", handle: "", brandTag: "#K", slots: [{ date: "2026-11-23", time: "12:00" }], mix: formatMix(1), recentTitles: [], market: null, outcomes: null, focus: null, en: false };
    const ip = buildIdeasPrompt({ ...base, strategy: "TUJUAN X", replaceNote: "lebih lucu" });
    expect(ip).toContain("TUJUAN X");
    expect(ip).toContain("lebih lucu");
    expect(ip).toContain('"ideas"');
    const wp = buildGeneratePrompt({ ...base, ideas: [{ date: "2026-11-23", time: "12:00", kind: "carousel", pillar: "Edukasi", title: "Cara seduh", angle: "hemat waktu", hook: "#5: Dulu 10 menit" }] });
    expect(wp).toContain("RENCANA DARI STRATEGIST");
    expect(wp).toContain('"Cara seduh"');
    expect(wp).not.toContain("SLOT (isi tepat");
    expect(ideasWeekSchema.safeParse({ ideas: [{ date: "2026-11-23", time: "12:00", kind: "reel", title: "x" }] }).success).toBe(true);
  });
  it("senior review prompt & fixed slide merge keeps visuals", () => {
    const orig: Slide[] = [{ type: "cover", title: "A", visual: "cup", image: "u/autopilot/p/v.png", corners: ["a"] }, { type: "cta", title: "B" }];
    const merged = mergeFixedSlides(orig, [{ type: "cover", title: "A better" }, { type: "cta", title: "B better" }]);
    expect(merged[0]).toMatchObject({ title: "A better", visual: "cup", image: "u/autopilot/p/v.png", corners: ["a"] });
    expect(mergeFixedSlides(orig, [{ type: "cover", title: "x" }])).toBe(orig);
    const p = buildTeamReviewPrompt({ brandBlock: "- Produk: kopi", voice: null, catalog: null, posts: [{ kind: "carousel", pillar: "Edukasi", title: "T", slides: orig, caption: "cap", script: null }], en: false });
    expect(p).toContain("POST 0");
    expect(p).toContain("FAKTA");
    expect(reviewSchema.safeParse({ reviews: [{ i: 0, score: 9, issues: [], fix: null }] }).success).toBe(true);
  });
});

describe("brand research", () => {
  const r = researchSchema.parse({
    business: { summary: "Photobox self-service di stasiun KAI Bogor.", category: "Photobox", products: [{ name: "Photobox 4 frame", description: "cetak instan" }], target_audience: "Anak muda & keluarga", usp: "Cetak 1 menit", voice: "ceria", location: "Bogor" },
    kv: { primary: "#FF4F8B", secondary: "#FFD23F", background: "#FFF6EC", mood: "ceria & hangat" },
    dna: { name: "KV Photobebaz", bg: "photo", font: "fredoka", hero: "full", ornaments: ["sticker"], visualStyle: "photo-lifestyle" },
    visual_subjects: ["a photobox booth with ring light and props, friends posing"],
    product_images: [0, 2],
  });
  it("fills only empty Brand Kit fields", () => {
    const kit = mergeIntoKit({ products: "Paket wisuda", color_primary: "#111111" }, r);
    expect(kit.products).toBe("Paket wisuda");
    expect(kit.color_primary).toBe("#111111");
    expect(kit.color_secondary).toBe("#FFD23F");
    expect(kit.target_audience).toBe("Anak muda & keluarga");
    expect(String(kit.notes)).toContain("Photobox self-service");
  });
  it("visual subjects block & prompt", () => {
    expect(visualSubjectsBlock(r)).toContain("photobox booth");
    expect(visualSubjectsBlock(null)).toBeNull();
    const p = researchPrompt({ name: "Photobebaz", handle: "@photobebaz", website: null, kitSummary: "", sources: [{ title: "t", url: "https://x.id", content: "photobox" }], imageCount: 3, igImages: 0, en: false });
    expect(p).toContain("Photobebaz");
    expect(p).toContain("JANGAN default biru");
  });
});

describe("visual sense", () => {
  it("dedupes title/accent repetition", () => {
    expect(dedupeAccent({ type: "point", title: "Pilih pose natural", accent: "natural" })).toMatchObject({ title: "Pilih pose", accent: "natural" });
    expect(dedupeAccent({ type: "point", title: "Perhatikan arah cahaya", accent: "cahaya" }).title).toBe("Perhatikan arah");
    expect(dedupeAccent({ type: "point", title: "Cahaya", accent: "cahaya." }).accent).toBeUndefined();
    expect(dedupeAccent({ type: "point", title: "Berdiri rapat", accent: "sedikit miring" }).title).toBe("Berdiri rapat");
  });
  it("full-frame slide visual prompt", () => {
    const p = slideVisualPromptFor(presetById("fnb-photo")!.dna, "friends posing in a photobox", { primary: "#FF4F8B", accent: "#FFD23F" });
    expect(p).toMatch(/full-frame/);
    expect(p).toMatch(/Portrait 3:4/);
    expect(p).toMatch(/no text/i);
  });
  it("writer prompt carries the visual-sense rules", () => {
    expect(SLIDE_SPEC).toContain("SENSE VISUAL");
    expect(SLIDE_SPEC).toContain("JANGAN mengulang kata");
  });
});

describe("visual director", () => {
  const plan = postPlanSchema.parse({
    post: 0,
    bible: "three Indonesian friends in their early 20s, pastel pink and yellow outfits, soft ring-light, photobox booth in a mall",
    slides: [
      { slide: 1, needs_image: true, reason: "cover", subject_type: "orang", scene: "3 sahabat di booth", image_prompt: "three friends laughing inside a photobox booth", text_safe_zone: "bottom-35%" },
      { slide: 2, needs_image: true, reason: "pose", subject_type: "orang", scene: "berdiri rapat miring", image_prompt: "three friends standing shoulder to shoulder leaning to the center", text_safe_zone: "bottom-35%" },
      { slide: 3, needs_image: true, reason: "cahaya", subject_type: "objek", scene: "ring light", image_prompt: "a ring light", text_safe_zone: "top-35%" },
      { slide: 4, needs_image: true, reason: "gerak", subject_type: "orang", scene: "tertawa", image_prompt: "friends mid-laugh", text_safe_zone: "bottom-35%" },
      { slide: 5, needs_image: false, reason: "rangkuman" },
      { slide: 6, needs_image: false, reason: "cta" },
    ],
  });
  const types: Slide["type"][] = ["cover", "point", "point", "point", "list", "cta"];
  it("cover first, then the most visual inner slides within the cap", () => {
    const jobs = selectJobs(plan, { innerCap: 2, slideTypes: types });
    expect(jobs.map((j) => j.slide)).toEqual([1, 2, 4]);
    expect(selectJobs(plan, { innerCap: 0, slideTypes: types }).map((j) => j.slide)).toEqual([1]);
    expect(selectJobs(plan, { innerCap: 5, slideTypes: types }).map((j) => j.slide)).toEqual([1, 2, 3, 4]);
  });
  it("never plans images for summary/poll/cta slides even if asked", () => {
    const bad = postPlanSchema.parse({ post: 0, bible: "x", slides: [{ slide: 5, needs_image: true, reason: "x", subject_type: "objek", image_prompt: "a list" }] });
    expect(selectJobs(bad, { innerCap: 5, slideTypes: types })).toEqual([]);
  });
  it("final prompt carries continuity, safe zone, no-text and product rules", () => {
    const p = finalImagePrompt({ plan: plan.slides[1], bible: plan.bible, dna: null, palette: { primary: "#FF4F8B", secondary: "#FFD23F" }, talentRef: true });
    expect(p).toContain("standing shoulder to shoulder");
    expect(p).toContain("Carousel continuity");
    expect(p).toContain("SAME people");
    expect(p).toContain("BOTTOM 35%");
    expect(p).toContain("4:5");
    expect(p).toMatch(/no text/i);
    const top = finalImagePrompt({ plan: plan.slides[2], bible: "b", dna: null, palette: { primary: "#000000", secondary: "#FFFFFF" } });
    expect(top).toContain("TOP 35%");
    const prod = finalImagePrompt({ plan: { ...plan.slides[1], use_product_photo: true }, bible: "b", dna: null, palette: { primary: "#000000", secondary: "#FFFFFF" }, productName: "Photobox 4 frame" });
    expect(prod).toContain('real product "Photobox 4 frame" EXACTLY');
  });
  it("director prompt explains the decision rules", () => {
    const p = buildDirectorPrompt({ brandBlock: "- Produk: photobox", research: null, dna: null, palette: { primary: "#FF4F8B", secondary: "#FFD23F" }, posts: [{ kind: "carousel", title: "T", pillar: "Edukasi", slides: [{ type: "cover", title: "A" }], hasProductPhoto: false }] });
    expect(p).toContain("needs_image");
    expect(p).toContain("bible");
    expect(p).toContain("teks slide ditutup");
  });
});

describe("tolerant AI output parsing", () => {
  it("director plan accepts long text, English subject names and string flags", () => {
    const p = postPlanSchema.safeParse({
      post: 0,
      bible: "x".repeat(900),
      slides: [{ slide: "2", needs_image: "true", reason: "r".repeat(500), subject_type: "Person", image_prompt: "p".repeat(2000), text_safe_zone: "top 35%", use_product_photo: "no" }],
    });
    expect(p.success).toBe(true);
    if (p.success) {
      expect(p.data.slides[0]).toMatchObject({ slide: 2, needs_image: true, subject_type: "orang", text_safe_zone: "top-35%", use_product_photo: false });
      expect(p.data.bible.length).toBe(700);
    }
  });
  it("style DNA from research survives odd values", () => {
    const d = parseDna({ name: "KV Photobebaz yang sangat panjang sekali melebihi enam puluh karakter batasnya", bg: "neon", font: "Comic", ornaments: ["sticker", "glitter"], visualStyle: "x", titleScale: 3 });
    expect(d).toMatchObject({ bg: "light", font: "jakarta", ornaments: ["sticker"], titleScale: 1.25 });
    expect(d!.name.length).toBeLessThanOrEqual(60);
  });
});
