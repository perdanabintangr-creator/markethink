import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { cronAuthorized } = await import("@/lib/cron");
const { isWatchable, nextWeek, WATCH_INTERVAL_DAYS } = await import("@/lib/addons/watchers");

const req = (auth?: string) => new Request("https://x.test/api/cron/watchers", auth ? { headers: { authorization: auth } } : {});

describe("pantau mingguan", () => {
  it("cron hanya jalan dengan CRON_SECRET yang benar", () => {
    expect(cronAuthorized(req("Bearer rahasia"), "rahasia")).toBe(true);
    expect(cronAuthorized(req("Bearer salah"), "rahasia")).toBe(false);
    expect(cronAuthorized(req(), "rahasia")).toBe(false);
    expect(cronAuthorized(req("Bearer "), "")).toBe(false);
    expect(cronAuthorized(req("Bearer x"), undefined)).toBe(false);
  });
  it("hanya tool yang datanya bisa berubah tiap minggu", () => {
    expect(isWatchable("competitor")).toBe(true);
    expect(isWatchable("audit")).toBe(true);
    expect(isWatchable("calendar")).toBe(false);
  });
  it("jadwal berikutnya 7 hari lagi", () => {
    const now = Date.UTC(2026, 9, 27);
    expect(new Date(nextWeek(now)).getTime() - now).toBe(WATCH_INTERVAL_DAYS * 86_400_000);
  });
});
