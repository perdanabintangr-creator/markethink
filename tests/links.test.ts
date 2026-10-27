import { describe, expect, it } from "vitest";

const { extractLinks, isPrivateAddress, googleExportUrl, readLink, linkContext, linkHistoryText, toLinkPart, LINK_CHARS_HISTORY } = await import("@/lib/ai/links");

describe("Baca tautan di chat", () => {
  it("ambil maks 3 tautan unik, buang tanda baca penutup", () => {
    const t = "cek https://a.com/x, lalu (https://b.id/y). juga https://a.com/x dan https://c.com https://d.com";
    expect(extractLinks(t)).toEqual(["https://a.com/x", "https://b.id/y", "https://c.com/"]);
    expect(extractLinks("https://id.wikipedia.org/wiki/Kopi_(minuman)")).toEqual(["https://id.wikipedia.org/wiki/Kopi_(minuman)"]);
    expect(extractLinks("tanpa link")).toEqual([]);
  });

  it("alamat internal ditolak", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.20.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0"])
      expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "104.16.1.1", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  it("tautan internal tidak dibuka", async () => {
    for (const u of ["http://localhost:3000/x", "http://127.0.0.1/", "http://169.254.169.254/latest/meta-data", "http://user:pw@example.com/"]) {
      const r = await readLink(u);
      expect(r.ok, u).toBe(false);
      expect(r.note).toBe("Alamat ini tidak diizinkan.");
    }
  });

  it("media sosial & marketplace ditolak dengan alasan jelas", async () => {
    const ig = await readLink("https://www.instagram.com/p/abc/");
    expect(ig).toMatchObject({ ok: false, kind: "blocked", host: "instagram.com" });
    expect(ig.note).toContain("Instagram");
    expect((await readLink("https://shopee.co.id/produk-i.1.2")).note).toContain("Shopee");
  });

  it("Google Docs/Sheets/Slides/Drive → tautan ekspor", () => {
    const g = (u: string) => googleExportUrl(new URL(u));
    expect(g("https://docs.google.com/document/d/AbC_1/edit?usp=sharing")).toBe("https://docs.google.com/document/d/AbC_1/export?format=txt");
    expect(g("https://docs.google.com/spreadsheets/d/XyZ/edit#gid=123")).toBe("https://docs.google.com/spreadsheets/d/XyZ/export?format=csv&gid=123");
    expect(g("https://docs.google.com/presentation/d/P1/edit")).toBe("https://docs.google.com/presentation/d/P1/export/txt");
    expect(g("https://drive.google.com/file/d/F9/view")).toBe("https://drive.google.com/uc?export=download&id=F9");
    expect(g("https://example.com/")).toBeNull();
  });

  it("konteks AI: isi ditandai sebagai data, gagal → jujur ke user; riwayat dipotong", () => {
    const ok = { url: "https://a.com/", host: "a.com", ok: true, kind: "web" as const, title: "Judul", text: "x".repeat(20_000), note: null };
    const ctx = linkContext([ok, { ...ok, url: "https://instagram.com/p", ok: false, kind: "blocked" as const, text: "", note: "Instagram wajib login" }]);
    expect(ctx).toContain("<untrusted_data");
    expect(ctx).toContain("[…dipotong]");
    expect(ctx).toContain("TIDAK TERBACA — Instagram wajib login");
    expect(ctx).toContain("JANGAN menebak");
    const part = toLinkPart(ok);
    expect(part.text.length).toBe(LINK_CHARS_HISTORY);
    expect(linkHistoryText(part)).toContain("Kamu sudah membaca tautan");
  });
});
