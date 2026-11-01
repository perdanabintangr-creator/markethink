import { describe, expect, it } from "vitest";
import { brandEmail, escapeHtml } from "@/lib/email-template";

describe("template email Marqthink", () => {
  it("memuat logo, judul, langkah, tombol, dan footer brand", () => {
    const html = brandEmail({
      appUrl: "https://marqthink.com/",
      eyebrow: "Akun baru",
      title: "Selamat datang",
      intro: "Halo",
      steps: [{ title: "Satu", desc: "a" }, { title: "Dua", desc: "b" }],
      button: { label: "Buka", url: "https://marqthink.com/dashboard" },
    });
    expect(html).toContain("https://marqthink.com/brand/marqthink-logo-on-light.png");
    expect(html).toContain("Selamat datang");
    expect(html).toContain('href="https://marqthink.com/dashboard"');
    expect(html).toContain(">2</div>");
    expect(html).toContain("@marqthink.ai");
  });
  it("escape teks dari user", () => {
    expect(escapeHtml('<b>"x"</b>&')).toBe("&lt;b&gt;&quot;x&quot;&lt;/b&gt;&amp;");
  });
});
