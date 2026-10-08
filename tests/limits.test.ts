import { describe, expect, it } from "vitest";
import { wibDayStart } from "@/lib/limits";

describe("batas harian (WIB)", () => {
  it("hari dimulai pukul 00.00 WIB = 17.00 UTC hari sebelumnya", () => {
    // 8 Okt 2026 10.00 WIB = 03.00 UTC
    expect(wibDayStart(Date.UTC(2026, 9, 8, 3)).toISOString()).toBe("2026-10-07T17:00:00.000Z");
    // 8 Okt 2026 23.30 WIB = 16.30 UTC
    expect(wibDayStart(Date.UTC(2026, 9, 8, 16, 30)).toISOString()).toBe("2026-10-07T17:00:00.000Z");
    // 9 Okt 2026 00.10 WIB = 8 Okt 17.10 UTC
    expect(wibDayStart(Date.UTC(2026, 9, 8, 17, 10)).toISOString()).toBe("2026-10-08T17:00:00.000Z");
  });
});
