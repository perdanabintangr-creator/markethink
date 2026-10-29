import { describe, expect, it } from "vitest";
import { collectPosts, dateBucket, initialMonth, latestPerChain, monthGrid, shiftMonth } from "@/lib/content-calendar";

const post = (date: string, title: string, time = "19.00") => ({ date, time, platform: "Instagram", format: "Reels", title, caption: "Halo", hashtags: ["kopi"] });

describe("kalender konten gabungan", () => {
  it("memakai versi terbaru tiap rantai revisi", () => {
    const runs = [
      { id: "a", revision_of: null, created_at: "2026-10-01T00:00:00Z", title: "Nov", output: { posts: [post("2026-11-02", "Lama")] } },
      { id: "a2", revision_of: "a", created_at: "2026-10-02T00:00:00Z", title: "Nov", output: { posts: [post("2026-11-02", "Baru"), post("2026-11-01", "Awal", "08.00")] } },
      { id: "b", revision_of: null, created_at: "2026-10-03T00:00:00Z", title: null, output: { posts: [post("bukan-tanggal", "X"), post("2026-12-05", "Des")] } },
    ];
    expect(latestPerChain(runs).map((r) => [r.rootId, r.id])).toEqual([["a", "a2"], ["b", "b"]]);
    const entries = collectPosts(runs, "Kalender");
    expect(entries.map((e) => e.title)).toEqual(["Awal", "Baru", "Des"]);
    expect(entries[0].runId).toBe("a");
    expect(entries[2].source).toBe("Kalender");
  });

  it("grid bulan mulai Senin & kelipatan 7", () => {
    const cells = monthGrid("2026-11"); // 1 Nov 2026 = Minggu
    expect(cells.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean)).toHaveLength(30);
  });

  it("geser bulan & bulan awal", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(initialMonth([{ date: "2026-11-02" }, { date: "2026-09-01" }], "2026-10")).toBe("2026-11");
    expect(initialMonth([{ date: "2026-09-01" }], "2026-10")).toBe("2026-09");
    expect(initialMonth([{ date: "2026-10-09" }], "2026-10")).toBe("2026-10");
    expect(initialMonth([], "2026-10")).toBe("2026-10");
  });

  it("kelompok waktu hasil (WIB)", () => {
    const now = Date.parse("2026-10-29T05:00:00Z");
    expect(dateBucket("2026-10-28T18:00:00Z", now)).toBe("today"); // 29 Okt 01.00 WIB
    expect(dateBucket("2026-10-25T05:00:00Z", now)).toBe("week");
    expect(dateBucket("2026-10-01T05:00:00Z", now)).toBe("older");
  });
});
