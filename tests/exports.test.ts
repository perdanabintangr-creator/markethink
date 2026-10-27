import { describe, expect, it } from "vitest";
import { adcopyToCsv, calendarToCsv, calendarToIcs, parseRupiah, parseTime } from "@/lib/addons/exports";

const post = { date: "2026-11-05", time: "19.30", platform: "Instagram", format: "Reels", pillar: "Edukasi", title: "Tips, trik; dan \"rahasia\"", caption: "Baris 1\nBaris 2", hashtags: ["kopi", "#senja"] };

describe("ekspor hasil Smart Tools", () => {
  it("kalender → .ics valid dengan zona WIB & pengingat", () => {
    const ics = calendarToIcs([post], "Kopi Senja", new Date("2026-10-27T00:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;TZID=Asia/Jakarta:20261105T193000");
    expect(ics).toContain("DTEND;TZID=Asia/Jakarta:20261105T200000");
    expect(ics).toContain("SUMMARY:[Instagram · Reels] Tips\\, trik\\; dan \"rahasia\"");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
  });
  it("jam tayang terbaca dari berbagai format", () => {
    expect(parseTime("19.00")).toEqual([19, 0]);
    expect(parseTime("07:15")).toEqual([7, 15]);
    expect(parseTime(undefined)).toEqual([19, 0]);
  });
  it("CSV aman untuk koma, kutip & baris baru", () => {
    const csv = calendarToCsv([post]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Tips, trik; dan ""rahasia"""');
    expect(csv).toContain('"Baris 1\nBaris 2"');
    const ads = adcopyToCsv([{ angle: "Promo", audience: "A", format: "image", hook: "h", primary_text: "p", headline: "H", description: "d", cta_button: "Beli", visual: "v", extra_headlines: ["a", "b"] }], "meta");
    expect(ads).toContain("V1,meta,Promo");
    expect(ads).toContain("a | b");
  });
  it("harga Indonesia terbaca", () => {
    expect(parseRupiah("Rp45rb")).toBe(45000);
    expect(parseRupiah("Rp 150.000/bulan")).toBe(150000);
    expect(parseRupiah("1,5 jt")).toBe(1500000);
    expect(parseRupiah("45k")).toBe(45000);
    expect(parseRupiah("gratis")).toBeNull();
  });
});
