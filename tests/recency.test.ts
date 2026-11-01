import { describe, expect, it } from "vitest";
import { googleDateRange, isRecentSource, parseSourceDate, recencyRule } from "@/lib/ai/recency";

const now = new Date("2026-11-01T00:00:00Z");

describe("kesegaran sumber (maks 2 tahun)", () => {
  it("rentang tanggal Google mulai 2 tahun lalu", () => {
    expect(googleDateRange(now)).toBe("cdr:1,cd_min:11/1/2024,cd_max:");
  });
  it("membaca berbagai format tanggal", () => {
    expect(parseSourceDate("3 days ago", now)?.toISOString().slice(0, 10)).toBe("2026-10-29");
    expect(parseSourceDate("2 tahun yang lalu", now)?.getFullYear()).toBe(2024);
    expect(parseSourceDate("Mar 5, 2021", now)?.toISOString().slice(0, 10)).toBe("2021-03-05");
    expect(parseSourceDate("5 Agu 2025", now)?.toISOString().slice(0, 10)).toBe("2025-08-05");
    expect(parseSourceDate("2023-04-01T10:00:00Z", now)?.getUTCFullYear()).toBe(2023);
    expect(parseSourceDate("tanpa tanggal", now)).toBeNull();
  });
  it("menyaring sumber lama, menerima yang baru / tanpa tanggal", () => {
    expect(isRecentSource("Jan 10, 2022", now)).toBe(false);
    expect(isRecentSource("5 years ago", now)).toBe(false);
    expect(isRecentSource("Feb 2, 2025", now)).toBe(true);
    expect(isRecentSource("1 week ago", now)).toBe(true);
    expect(isRecentSource(undefined, now)).toBe(true);
  });
  it("aturan prompt menyebut tahun berjalan", () => {
    expect(recencyRule(now)).toContain("2024–2026");
  });
});
