import { describe, expect, it } from "vitest";
import { autopilotGate, completeness, kitChanged, mergeOnboarding, nextVersion, REQUIRED, MIN_REAL_PHOTOS } from "@/lib/brand/onboarding";
import { brandDnaSchema, dnaBlock, dnaContext, mergeDna, pillarMixFromDna, profileBlock, socmedSchema, visualGuide } from "@/lib/brand/dna";
import { researchPrompt, researchSchema } from "@/lib/autopilot/research-shape";

const fullKit = {
  category: "Photobox",
  instagram: "https://instagram.com/photobebaz/",
  target_audience: "Gen Z & keluarga muda",
  content_goal: "booking",
  location: "Jakarta",
  cta_primary: "whatsapp",
};
const assets = [{ kind: "logo" as const }, ...Array.from({ length: MIN_REAL_PHOTOS }, () => ({ kind: "real_photo" as const }))];

const drafts = {
  designer: {
    palette: { primary: "#F2994A", secondary: "#1F2937", rules: "oranye untuk aksen" },
    typography: { font: "fredoka", rules: "rounded" },
    image_style: { type: "foto realistis", lighting: "flash", angle: "eye level", composition: "grup" },
    casting_guide: "anak muda ceria",
    prompt_style_guide: "bright photobox studio with ring light",
    style_dna: { name: "Photobebaz", bg: "photo", font: "fredoka", hero: "full", visualStyle: "photo-lifestyle" },
  },
  copywriter: { tone: "santai ceria", forbidden: ["murah banget", "terbaik"], hook_patterns: ["Foto bareng kaku?"], sample_captions: ["Siap seru-seruan?"] },
  socmed: {
    audience: { profile: "Gen Z", problems: ["pose kaku"], desires: ["foto lucu"] },
    format_mix: { carousel: 3, reel: 2, image: 2 },
    pillar_mix: { edukasi: 30, relatable: 30, insight: 10, produk: 30 },
    posting_times: ["19:00", "12.00", "25:00", "x"],
  },
};
const cd = { creative_director: { big_idea: "Momen seru jadi kenangan", mood_keywords: ["ceria", "hangat"], pillars: [{ name: "Tips pose" }] }, designer: null, copywriter: null, socmed: null };

describe("brand onboarding — kelengkapan & gate", () => {
  it("brand kosong: wajib belum lengkap, semua field wajib terdaftar", () => {
    const c = completeness({ name: "", kit: {}, assets: [] });
    expect(c.requiredDone).toBe(false);
    expect(c.missing.length).toBe(REQUIRED.length);
    expect(c.percent).toBe(0);
  });
  it("wajib lengkap → minimal 70%, opsional menambah", () => {
    const c = completeness({ name: "Photobebaz", kit: fullKit, assets });
    expect(c.requiredDone).toBe(true);
    expect(c.percent).toBeGreaterThanOrEqual(70);
    const more = completeness({ name: "Photobebaz", kit: { ...fullKit, website: "x", usp: "y" }, assets: [...assets, { kind: "feed_screenshot" }] });
    expect(more.percent).toBeGreaterThan(c.percent);
  });
  it("foto asli kurang dari minimum → masih terkunci", () => {
    const c = completeness({ name: "P", kit: fullKit, assets: [{ kind: "logo" }, { kind: "real_photo" }] });
    expect(c.requiredDone).toBe(false);
    expect(c.missing.map((m) => m.key)).toEqual(["real_photos"]);
  });
  it("gate Autopilot: brand → data wajib → ACC DNA", () => {
    expect(autopilotGate({ workspaceId: null, requiredDone: true, approvedVersion: 1 })).toBe("no_brand");
    expect(autopilotGate({ workspaceId: "w", requiredDone: false, approvedVersion: 1 })).toBe("onboarding");
    expect(autopilotGate({ workspaceId: "w", requiredDone: true, approvedVersion: null })).toBe("dna_not_approved");
    expect(autopilotGate({ workspaceId: "w", requiredDone: true, approvedVersion: 2 })).toBeNull();
  });
  it("mergeOnboarding: warna dinormalkan, IG → handle, field kosong dihapus", () => {
    const k = mergeOnboarding({ usp: "lama", foo: 1 }, { instagram: "https://www.instagram.com/photobebaz/?hl=id", color_primary: "f2994a", color_secondary: "bukan", usp: "" });
    expect(k.social_handle).toBe("@photobebaz");
    expect(k.color_primary).toBe("#F2994A");
    expect(k.color_secondary).toBeUndefined();
    expect(k.usp).toBeUndefined();
    expect(k.foo).toBe(1);
  });
});

describe("brand DNA — versi", () => {
  it("nextVersion", () => {
    expect(nextVersion([])).toBe(1);
    expect(nextVersion([1, 3, 2])).toBe(4);
  });
  it("kitChanged: hanya field yang memengaruhi DNA + jumlah aset", () => {
    const snap = { ...fullKit, _assets: 4 };
    expect(kitChanged(null, fullKit)).toBe(false);
    expect(kitChanged(snap, { ...fullKit, _assets: 4, notes: "baru" })).toBe(false);
    expect(kitChanged(snap, { ...fullKit, _assets: 5 })).toBe(true);
    expect(kitChanged(snap, { ...fullKit, _assets: 4, target_audience: "ibu muda" })).toBe(true);
  });
  it("mergeDna: bagian null dari CD memakai draf tim; CD menang bila valid", () => {
    const d = mergeDna(drafts, cd);
    expect(d).not.toBeNull();
    expect(d!.creative_director.big_idea).toBe("Momen seru jadi kenangan");
    expect(d!.designer.palette.primary).toBe("#F2994A");
    const over = mergeDna(drafts, { ...cd, copywriter: { ...drafts.copywriter, tone: "hangat" } });
    expect(over!.copywriter.tone).toBe("hangat");
  });
  it("mergeDna gagal → null bila satu peran tidak bisa dibaca sama sekali", () => {
    expect(mergeDna({ ...drafts, designer: "rusak" }, cd)).toBeNull();
  });
  it("socmed toleran: jam posting tidak valid dibuang, format 12.00 diperbaiki", () => {
    const s = socmedSchema.parse(drafts.socmed);
    expect(s.posting_times).toEqual(["19:00", "12:00"]);
  });
  it("dnaBlock & visualGuide memuat versi, kata terlarang, palet", () => {
    const d = brandDnaSchema.parse(mergeDna(drafts, cd));
    const b = dnaBlock(d, 3);
    expect(b).toContain("BRAND DNA v3");
    expect(b).toContain("murah banget");
    expect(visualGuide(d)).toContain("#F2994A");
    expect(pillarMixFromDna(d)).toEqual({ edukasi: 30, relatable: 30, insight: 10, produk: 30 });
  });
});

describe("brand DNA — riset & fallback", () => {
  it("riset gagal → konteks fallback hanya dari profil klien", () => {
    const ctx = dnaContext(profileBlock("Photobebaz", fullKit), null);
    expect(ctx).toContain("Nama brand: Photobebaz");
    expect(ctx).toContain("Target audiens: Gen Z");
    expect(ctx).toContain("fallback");
  });
  it("riset dengan analisis aset klien masuk konteks", () => {
    const research = researchSchema.parse({
      business: { summary: "Sewa photobox", category: "Event" },
      kv: { primary: "#F2994A", secondary: "#1F2937", mood: "ceria" },
      dna: { name: "KV Photobebaz", description: "ceria" },
      asset_insights: { logo: "oranye bulat", photos: "flash, grup ceria" },
    });
    const ctx = dnaContext("- Nama brand: Photobebaz", research);
    expect(ctx).toContain("ANALISIS ASET KLIEN");
    expect(ctx).toContain("flash, grup ceria");
    expect(ctx).not.toContain("fallback");
  });
  it("prompt riset meminta asset_insights hanya bila ada aset klien", () => {
    const base = { name: "Photobebaz", handle: "@photobebaz", website: null, kitSummary: "", sources: [], imageCount: 3, igImages: 0, en: false };
    expect(researchPrompt({ ...base, assetLegend: "0 logo, 1-2 foto asli" })).toContain("asset_insights");
    expect(researchPrompt(base)).not.toContain("asset_insights");
  });
});
