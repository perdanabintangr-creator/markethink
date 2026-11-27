import { describe, expect, it } from "vitest";
import { isCreativeTask } from "@/lib/ai/auto-tier";
import { creativeCandidate, getTier, MODEL_PRICING_USD } from "@/lib/ai/models.config";
import { ADMIN_ALLOWANCE, CONTENT_PLANS } from "@/lib/autopilot/quota";

describe("Senior campuran (Qwen untuk tugas kreatif)", () => {
  it("tugas kreatif → Qwen", () => {
    expect(isCreativeTask("Buatkan 3 caption Instagram untuk kedai kopi susu gula aren di Bandung")).toBe(true);
    expect(isCreativeTask("Buat 5 variasi headline iklan Meta Ads untuk kursus bahasa Inggris")).toBe(true);
    expect(isCreativeTask("Buat persona pembeli utama untuk brand hijab premium")).toBe(true);
    expect(isCreativeTask("Buat kalender konten Instagram 1 minggu untuk klinik gigi")).toBe(true);
    expect(isCreativeTask("Analisis kompetitor brand sambal kemasan premium")).toBe(true);
  });
  it("hitungan, budget, komplain, naskah video, strategi bisnis → tetap Claude", () => {
    expect(isCreativeTask("Susun campaign plan Harbolnas dengan budget iklan Rp3 juta")).toBe(false);
    expect(isCreativeTask("Jelaskan cara menghitung CAC dan LTV")).toBe(false);
    expect(isCreativeTask("Tulis naskah video TikTok 30 detik untuk laundry")).toBe(false);
    expect(isCreativeTask("Template balasan WA untuk pelanggan yang komplain pesanan telat")).toBe(false);
    expect(isCreativeTask("Caption promo diskon 30% untuk toko baju")).toBe(false);
    expect(isCreativeTask("Halo, apa kabar?")).toBe(false);
  });
  it("model kreatif & harga terdaftar; bisa dimatikan lewat env", () => {
    const c = creativeCandidate({});
    expect(c).toEqual({ provider: "openrouter", modelId: "qwen/qwen3.7-plus" });
    expect(MODEL_PRICING_USD["openrouter:qwen/qwen3.7-plus"]).toBeDefined();
    expect(creativeCandidate({ MODEL_SENIOR_CREATIVE: "off" })).toBeNull();
  });
  it("Director memakai Fable 5.2 (20% lebih murah)", () => {
    expect(getTier("director").candidates[0]).toEqual({ provider: "anthropic", modelId: "claude-fable-5-2" });
    expect(MODEL_PRICING_USD["anthropic:claude-fable-5-2"]).toMatchObject({ input: 8, output: 40 });
  });
});

describe("Paket konten Cara 1", () => {
  it("harga, jatah konten & jatah ganti gambar", () => {
    expect(CONTENT_PLANS.konten_lite).toMatchObject({ price: 149_000, postsPerMonth: 12, regensPerMonth: 6 });
    expect(CONTENT_PLANS.konten_pro).toMatchObject({ price: 229_000, postsPerMonth: 20, regensPerMonth: 10 });
    expect(CONTENT_PLANS.konten_bisnis).toMatchObject({ price: 589_000, postsPerMonth: 40, innerVisuals: 4, regensPerMonth: 15 });
    expect(ADMIN_ALLOWANCE.regensPerMonth).toBeGreaterThan(0);
  });
});
