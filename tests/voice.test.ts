import { describe, expect, it } from "vitest";
import { fillerFor, speakableText, speechChunks, speechLang } from "@/lib/voice/speech";

describe("mode ngobrol suara", () => {
  it("membersihkan markdown supaya enak diucapkan", () => {
    const md = "## Strategi\n\n**Fokus** ke [Instagram](https://x.com) — konten 🎉\n\n- Poin satu\n- Poin dua\n\n| a | b |\n|---|---|\n\n```js\ncode()\n```";
    const s = speakableText(md, "id");
    expect(s).not.toMatch(/[#*|`🎉—]|https?:/);
    expect(s).toContain("Fokus ke Instagram, konten");
    expect(s).toContain("Poin satu");
  });

  it("memotong jawaban panjang di akhir kalimat & menyebut detail di layar", () => {
    const long = Array.from({ length: 60 }, (_, i) => `Kalimat nomor ${i} cukup panjang.`).join(" ");
    const s = speakableText(long, "id", 300);
    expect(s.length).toBeLessThan(360);
    expect(s).toMatch(/\. Detail lengkapnya ada di layar ya\.$/);
    expect(speakableText(long, "en", 300)).toMatch(/full details are on your screen\.$/);
  });

  it("memecah teks per kalimat tanpa melebihi batas", () => {
    const parts = speechChunks(`${"kata ".repeat(120)}. Halo! Apa kabar?`, 200);
    expect(parts.every((p) => p.length <= 200)).toBe(true);
    expect(parts.join(" ")).toContain("Apa kabar?");
  });

  it("kalimat jeda menyesuaikan permintaan & bahasa", () => {
    expect(fillerFor("buatkan PPT 10 slide", "id")).toMatch(/presentasi/);
    expect(fillerFor("bikin poster promo", "id")).toMatch(/visual/);
    expect(fillerFor("make a deck", "en")).toMatch(/presentation/);
    expect(speechLang("en")).toBe("en-US");
    expect(speechLang("id")).toBe("id-ID");
  });
});
