import { describe, expect, it } from "vitest";
import { marketContext, paydayPhase, upcomingMoments, wibDate } from "@/lib/ai/market-id";

describe("Pengetahuan Pasar Indonesia", () => {
  it("tanggal WIB: 23.30 UTC sudah hari berikutnya di Jakarta", () => {
    expect(wibDate(new Date("2026-11-14T23:30:00Z")).toISOString().slice(0, 10)).toBe("2026-11-15");
  });
  it("momen terdekat dari 15 Nov 2026 berurutan & mencakup Harbolnas", () => {
    const list = upcomingMoments(new Date("2026-11-15T03:00:00Z"), 75);
    const names = list.map((m) => m.name);
    expect(names[0]).toBe("Black Friday");
    expect(names).toContain("Harbolnas 12.12");
    expect(names).toContain("Tahun Baru");
    expect(list.find((m) => m.name === "Harbolnas 12.12")?.inDays).toBe(27);
    expect(names).not.toContain("Ramadan"); // 8 Feb 2027 > 75 hari
  });
  it("Ramadan yang sedang berlangsung tetap muncul", () => {
    const list = upcomingMoments(new Date("2027-02-20T03:00:00Z"), 30);
    expect(list.find((m) => m.name === "Ramadan")?.ongoing).toBe(true);
  });
  it("siklus gajian", () => {
    expect(paydayPhase(new Date("2026-11-27T03:00:00Z"))).toMatch(/gajian/);
    expect(paydayPhase(new Date("2026-11-18T03:00:00Z"))).toMatch(/tanggal tua/);
    expect(paydayPhase(new Date("2026-11-08T03:00:00Z"))).toMatch(/normal/);
  });
  it("konteks memuat label perkiraan & sumber biaya iklan", () => {
    const ctx = marketContext(new Date("2027-01-20T03:00:00Z"));
    expect(ctx).toContain("Ramadan: 8 Feb 2027–9 Mar 2027");
    expect(ctx).toContain("[perkiraan, menunggu penetapan resmi]");
    expect(ctx).toContain("Sumber: Olakses");
  });
});
