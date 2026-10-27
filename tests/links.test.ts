import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { extractUrls, isPublicUrl, linksEvidence } = await import("@/lib/addons/links");

describe("baca link dari form", () => {
  it("ambil maks 3 URL unik dari isian teks", () => {
    expect(
      extractUrls({ a: "Lihat https://kopisenja.id, dan https://kopisenja.id/menu.", b: "(https://shopee.co.id/kopi)", c: 5, d: "https://a.com https://b.com" }),
    ).toEqual(["https://kopisenja.id", "https://kopisenja.id/menu", "https://shopee.co.id/kopi"]);
  });
  it("tolak alamat internal (anti SSRF)", () => {
    for (const bad of ["http://localhost/x", "http://127.0.0.1", "http://10.0.0.5", "http://192.168.1.1", "http://169.254.169.254/latest", "http://[::1]/", "http://intranet", "http://a.b:8080/", "ftp://x.com", "http://user:pw@x.com"])
      expect(isPublicUrl(bad), bad).toBe(false);
    expect(isPublicUrl("https://www.kopisenja.id/menu")).toBe(true);
  });
  it("link yang tidak terbaca ditandai supaya AI tidak mengarang", () => {
    expect(linksEvidence([{ url: "https://instagram.com/x", title: "", description: "", text: "", ok: false }])).toContain("Tidak bisa dibaca otomatis");
  });
});
