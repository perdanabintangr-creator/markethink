import { describe, expect, it } from "vitest";
import { brandKitCompleteness, niceMax, usageByDay, usageCategory, wibDay } from "@/lib/dashboard";
import { crumbsFor } from "@/lib/breadcrumbs";
import { timeAgo, workspaceUiText } from "@/lib/i18n/workspace-ui";

describe("dashboard: pemakaian kredit", () => {
  it("kelompok dari reason ledger", () => {
    expect(usageCategory("chat_settle")).toBe("chat");
    expect(usageCategory("llm_error")).toBe("chat");
    expect(usageCategory("tool:calendar")).toBe("tools");
    expect(usageCategory("agent")).toBe("tools");
    expect(usageCategory("deck_images")).toBe("media");
    expect(usageCategory("carousel_failed")).toBe("media");
    expect(usageCategory("admin_grant")).toBeNull();
  });

  it("per hari menurut WIB, refund mengurangi, tidak pernah minus", () => {
    const now = Date.parse("2026-10-29T05:00:00Z"); // 12.00 WIB
    const rows = [
      { delta: -10, reason: "chat", created_at: "2026-10-29T01:00:00Z" },
      { delta: 3, reason: "chat_settle", created_at: "2026-10-29T02:00:00Z" },
      { delta: -20, reason: "tool", created_at: "2026-10-28T18:30:00Z" }, // 29 Okt 01.30 WIB
      { delta: -5, reason: "image", created_at: "2026-10-27T03:00:00Z" },
      { delta: 50, reason: "admin_grant", created_at: "2026-10-29T03:00:00Z" },
      { delta: 9, reason: "tool_settle", created_at: "2026-10-26T03:00:00Z" },
      { delta: -99, reason: "chat", created_at: "2026-10-01T03:00:00Z" },
    ];
    const days = usageByDay(rows, 7, now);
    expect(days).toHaveLength(7);
    expect(days[6]).toEqual({ day: "2026-10-29", chat: 7, tools: 20, media: 0 });
    expect(days[4].media).toBe(5);
    expect(days[3].tools).toBe(0);
    expect(wibDay(Date.parse("2026-10-28T17:00:00Z"))).toBe("2026-10-29");
  });

  it("skala sumbu bulat & kelengkapan Brand Kit", () => {
    expect(niceMax(0)).toBe(5);
    expect(niceMax(7)).toBe(8);
    expect(niceMax(23)).toBe(30);
    expect(niceMax(130)).toBe(200);
    expect(niceMax(53)).toBe(60);
    expect(brandKitCompleteness({ products: "Kopi", usp: " ", color_primary: "#112233", logo_id: "x" })).toBe(38);
    expect(brandKitCompleteness(null)).toBe(0);
  });
});

describe("kerangka SaaS", () => {
  const t = workspaceUiText("id");
  it("breadcrumb dari alamat", () => {
    expect(crumbsFor("/dashboard", t, "id", [])).toEqual([{ label: "Dashboard" }]);
    const tool = crumbsFor("/tools/competitor/abc", t, "id", []);
    expect(tool.map((c) => c.label)).toEqual(["Smart Tools", expect.any(String), "Hasil"]);
    expect(crumbsFor("/workspaces/w1", t, "id", [{ id: "w1", name: "Kopi Senja" }]).at(-1)?.label).toBe("Kopi Senja");
  });
  it("waktu relatif", () => {
    const now = Date.parse("2026-10-29T05:00:00Z");
    expect(timeAgo(t, "2026-10-29T04:59:40Z", now)).toBe("baru saja");
    expect(timeAgo(t, "2026-10-29T04:30:00Z", now)).toBe("30 menit lalu");
    expect(timeAgo(t, "2026-10-28T05:00:00Z", now)).toBe("1 hari lalu");
  });
});
