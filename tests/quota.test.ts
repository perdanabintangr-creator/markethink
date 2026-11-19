import { describe, expect, it } from "vitest";
import { nextDayResetWib, nextWeekResetWib, quotaMessage, weekStartWib } from "@/lib/quota";

describe("Jatah mingguan + harian (WIB)", () => {
  it("reset harian = 00.00 WIB berikutnya", () => {
    // 19 Nov 2026 10.00 WIB = 03.00 UTC → reset 20 Nov 00.00 WIB = 19 Nov 17.00 UTC
    expect(nextDayResetWib(new Date("2026-11-19T03:00:00Z")).toISOString()).toBe("2026-11-19T17:00:00.000Z");
    // 23.30 WIB tetap reset tengah malam yang sama
    expect(nextDayResetWib(new Date("2026-11-19T16:30:00Z")).toISOString()).toBe("2026-11-19T17:00:00.000Z");
  });
  it("reset mingguan = Senin 00.00 WIB berikutnya", () => {
    // Kamis 19 Nov 2026 → Senin 23 Nov 00.00 WIB = 22 Nov 17.00 UTC
    expect(nextWeekResetWib(new Date("2026-11-19T03:00:00Z")).toISOString()).toBe("2026-11-22T17:00:00.000Z");
    // Senin 23 Nov 08.00 WIB → Senin berikutnya 30 Nov
    expect(nextWeekResetWib(new Date("2026-11-23T01:00:00Z")).toISOString()).toBe("2026-11-29T17:00:00.000Z");
    // Minggu 22 Nov 23.00 WIB → besok Senin
    expect(nextWeekResetWib(new Date("2026-11-22T16:00:00Z")).toISOString()).toBe("2026-11-22T17:00:00.000Z");
    expect(weekStartWib(new Date("2026-11-19T03:00:00Z")).toISOString()).toBe("2026-11-15T17:00:00.000Z");
  });
  it("pesan penolakan per alasan", () => {
    expect(quotaMessage("daily", false)).toMatch(/hari ini/);
    expect(quotaMessage("weekly", false)).toMatch(/Senin/);
    expect(quotaMessage("director", false)).toMatch(/Director/);
    expect(quotaMessage("daily", true)).toMatch(/Today/);
  });
});
