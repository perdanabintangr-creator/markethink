import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { autoTier, resolveTier } = await import("@/lib/ai/auto-tier");
const { withCacheBreakpoints } = await import("@/lib/chat-server");

describe("Otak Otomatis", () => {
  it("pesan ringan → Junior", () => {
    for (const t of ["halo", "buatkan 5 caption IG untuk promo kopi susu", "terjemahkan ke bahasa inggris: Selamat pagi", "ide nama produk keripik pedas"])
      expect(autoTier(t), t).toBe("junior");
  });
  it("strategi, dokumen, lampiran, riset, chat hasil Tools Pro → Senior", () => {
    expect(autoTier("Buatkan campaign plan 1 bulan untuk PhotoBebaz budget 3 juta")).toBe("senior");
    expect(autoTier("analisis kompetitor kopi kenangan")).toBe("senior");
    expect(autoTier("buatkan PPT presentasi produk")).toBe("senior");
    expect(autoTier("cek ini", { attachments: 1 })).toBe("senior");
    expect(autoTier("harga terbaru", { research: true })).toBe("senior");
    expect(autoTier("ok lanjut", { toolChat: true })).toBe("senior");
    expect(autoTier("x".repeat(400))).toBe("senior");
  });
  it("menyesuaikan dengan tier yang dibuka paket", () => {
    expect(resolveTier("auto", ["junior"], () => "senior")).toBe("junior");
    expect(resolveTier("auto", ["junior", "senior"], () => "junior")).toBe("junior");
    expect(resolveTier("associate", ["junior", "senior", "associate"], () => "junior")).toBe("associate");
  });
});

describe("cache riwayat chat", () => {
  it("menandai pesan asisten terakhir & pesan user terakhir", () => {
    const msgs = [
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
      { role: "assistant", content: "d" },
      { role: "user", content: "e" },
    ];
    const out = withCacheBreakpoints(msgs) as { providerOptions?: unknown }[];
    expect(out.map((m) => Boolean(m.providerOptions))).toEqual([false, false, false, true, true]);
  });
});

describe("Permintaan gambar → otak Junior (semua paket)", () => {
  it("murni gambar / edit gambar", async () => {
    const { isImageRequest } = await import("@/lib/ai/auto-tier");
    for (const t of [
      "Buatkan foto lifestyle: dua pekerja kantoran Indonesia tertawa memegang es kopi SEGERRRRR di trotoar Sudirman, format 4:5",
      "bikinin poster promo beli 2 gratis 1",
      "Ganti warna gerobaknya jadi kuning di gambar tadi",
      "tolong buatkan desain banner grand opening",
      "Gambar gerobak kopi listrik dengan crew-nya",
      "generate an image of iced coffee",
    ])
      expect(isImageRequest(t), t).toBe(true);
  });
  it("bukan permintaan gambar murni", async () => {
    const { isImageRequest } = await import("@/lib/ai/auto-tier");
    for (const t of [
      "Buatkan strategi launching lengkap + gambar poster",
      "buatkan PPT presentasi dengan foto produk",
      "buatkan caption untuk foto ini",
      "buatkan prompt gambar untuk Midjourney",
      "apa tren desain kemasan 2026?",
      "halo",
    ])
      expect(isImageRequest(t), t).toBe(false);
  });
});

describe("Permintaan PPT tidak memakai Gemini gratis", () => {
  it("deteksi PPT", async () => {
    const { isDeckRequest } = await import("@/lib/ai/auto-tier");
    for (const t of ["Buatkan PPT pitch deck untuk investor", "bikin presentasi 10 slide", "buat powerpoint laporan"]) expect(isDeckRequest(t), t).toBe(true);
    for (const t of ["buatkan caption", "strategi launching kopi", "deckorasi toko"]) expect(isDeckRequest(t), t).toBe(false);
  });
});
