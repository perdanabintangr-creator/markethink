import { describe, expect, it } from "vitest";
import { brandKitCompleteness } from "@/lib/dashboard";
import { timeAgo, workspaceUiText } from "@/lib/i18n/workspace-ui";

describe("beranda", () => {
  it("kelengkapan Brand Kit", () => {
    expect(brandKitCompleteness({ products: "Kopi", usp: " ", color_primary: "#112233", logo_id: "x" })).toBe(38);
    expect(brandKitCompleteness(null)).toBe(0);
  });
  it("waktu relatif", () => {
    const t = workspaceUiText("id");
    const now = Date.parse("2026-10-29T05:00:00Z");
    expect(timeAgo(t, "2026-10-29T04:59:40Z", now)).toBe("baru saja");
    expect(timeAgo(t, "2026-10-29T04:30:00Z", now)).toBe("30 menit lalu");
    expect(timeAgo(t, "2026-10-28T05:00:00Z", now)).toBe("1 hari lalu");
  });
  it("sapaan sesuai jam WIB", () => {
    const t = workspaceUiText("id");
    expect(t.greeting(8, "Dana")).toBe("Selamat pagi, Dana");
    expect(t.greeting(20, "")).toBe("Selamat malam");
  });
});
