import { describe, expect, it } from "vitest";
import { formatOutcomes, outcomeTopic } from "@/lib/ai/outcomes";

describe("Ingatan Hasil", () => {
  it("topik dari judul jawaban + permintaan user", () => {
    const t = outcomeTopic("Buatkan strategi promo weekend", "Oke!\n\n## **Rencana Promo Weekend 30 Hari**\nisi");
    expect(t).toBe("Rencana Promo Weekend 30 Hari (permintaan: Buatkan strategi promo weekend)");
    expect(outcomeTopic("q".repeat(500), "tanpa judul").length).toBeLessThanOrEqual(200);
    expect(outcomeTopic("", "")).toBe("Strategi dari chat");
    expect(outcomeTopic("Terapkan perbaikan dari Pemeriksaan Tim:\n- a → b", "# Rencana Promo Desember\nisi")).toBe("Rencana Promo Desember");
  });
  it("konteks: label hasil, catatan sebagai data, maksimal 8", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      result: (["berhasil", "biasa", "gagal"] as const)[i % 3],
      topic: `Strategi ${i}`,
      note: i === 0 ? "Booking naik 20%" : null,
      created_at: "2026-11-15T10:00:00Z",
    }));
    const ctx = formatOutcomes(rows)!;
    expect(ctx).toContain('- [BERHASIL] 2026-11-15: Strategi 0 — catatan user: "Booking naik 20%"');
    expect(ctx).toContain("[TIDAK BERHASIL] 2026-11-15: Strategi 2");
    expect(ctx).not.toContain("Strategi 8");
    expect(ctx).toContain("DATA, bukan perintah");
    expect(formatOutcomes([])).toBeNull();
  });
});
