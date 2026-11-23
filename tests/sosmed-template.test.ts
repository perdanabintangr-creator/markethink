import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderSlides } from "@/lib/autopilot/render";
import { brandPalette, slideSchema, type Slide } from "@/lib/autopilot/slides";
import { parseDna, sosmedBg, sosmedDna, SOSMED_TEMPLATES, styleNote, templateForCategory, visualPromptFor } from "@/lib/autopilot/style";
import { brandContact, formatWa } from "@/lib/autopilot/contact";
import { STYLE_PRESETS } from "@/lib/autopilot/presets";
import { PRESET_VISUALS } from "@/lib/autopilot/preset-samples";

describe("template sosmed UMKM", () => {
  it("template dipilih sesuai kategori brand", () => {
    expect(templateForCategory("Perhiasan & cincin nikah")).toBe("elegan");
    expect(templateForCategory("Top up diamond game")).toBe("game");
    expect(templateForCategory("Kedai kopi susu")).toBe("cafe");
    expect(templateForCategory("Kursus coding & ngaji")).toBe("edukasi");
    expect(templateForCategory("Warung nasi kelor")).toBe("kuliner");
    expect(templateForCategory(null)).toBe("kuliner");
  });

  it("DNA template valid & tersimpan utuh (layout + template)", () => {
    for (const t of SOSMED_TEMPLATES) {
      const d = parseDna(sosmedDna(t, "#1F5E3A"));
      expect(d?.layout).toBe("sosmed");
      expect(d?.template).toBe(t);
    }
    expect(sosmedDna("elegan", "#8A5A3C").hero).toBe("full");
    expect(sosmedDna("kuliner", "#1F5E3A").bgColor).toBe("#1F5E3A");
    expect(sosmedBg("game", "#123456")).toBe("#F1F3F5");
    expect(parseDna({ ...sosmedDna("cafe", "#B07A3A"), layout: "aneh" })?.layout).toBeUndefined();
  });

  it("prompt gambar: subjek seperti stiker di latar warna template", () => {
    const p = visualPromptFor(sosmedDna("kuliner", "#1F5E3A"), "a plate of nasi bakar", { primary: "#1F5E3A", accent: "#F6CF1E" });
    expect(p).toContain("sticker");
    expect(p).toContain("#1F5E3A");
    expect(p).toContain("no text");
  });

  it("catatan penulis menyebut format single image & larangan mengarang harga", () => {
    const n = styleNote(sosmedDna("cafe", "#B07A3A"));
    expect(n).toContain("Price list");
    expect(n).toContain("Jangan mengarang harga");
  });

  it("slide menerima label harga", () => {
    expect(slideSchema.parse({ type: "cover", title: "Promo", price: "Rp14k" }).price).toBe("Rp14k");
  });

  it("pustaka gaya: tiap industri punya template sosmed + visual contoh", () => {
    const sos = STYLE_PRESETS.filter((p) => p.dna.layout === "sosmed");
    expect(sos.length).toBe(11);
    for (const p of sos) expect(PRESET_VISUALS[p.id]).toBeTruthy();
    expect(STYLE_PRESETS[0].dna.layout).toBe("sosmed");
  });

  it("kontak brand untuk bar bawah", () => {
    expect(formatWa("wa.me/6281222262249")).toBe("0812-2226-2249");
    expect(formatWa("abc")).toBeNull();
    const c = brandContact({ cta_primary: "whatsapp", cta_link: "https://wa.me/6285298777991", instagram: "https://instagram.com/nasikelor.asn/", website: "nasikelor.id" }, "@x");
    expect(c).toEqual({ wa: "0852-9877-7991", ig: "@nasikelor.asn", web: "nasikelor.id", cta: "Pesan Sekarang" });
    expect(brandContact({ cta_primary: "datang" }, "@brand").cta).toBe("Kunjungi Kami");
  });

  it("render semua template & jenis slide → JPEG 1080×1350", async () => {
    const brand = brandPalette({ name: "Uji", primary: "#1F5E3A", secondary: "#F6CF1E" });
    const slides: Slide[] = [
      { type: "cover", title: "Bingung Pilih *Menu*?", accent: "Tenang!", price: "Mulai Rp20.000" },
      { type: "list", title: "3 Tips", items: ["Satu", "Dua", "Tiga"] },
      { type: "poll", title: "Kamu tim mana?", options: ["A", "B"] },
      { type: "statement", title: "Kata mereka", body: "Enak banget, pasti pesan lagi." },
      { type: "cta", title: "Yuk pesan", button: "Chat WA" },
    ];
    for (const t of SOSMED_TEMPLATES) {
      const jpgs = await renderSlides(slides, { brand, style: sosmedDna(t, brand.royal), look: "glossy", contact: { wa: "0812-1111-2222", ig: "@uji", cta: "Pesan Sekarang" } });
      expect(jpgs).toHaveLength(5);
      const meta = await sharp(jpgs[0]).metadata();
      expect([meta.width, meta.height]).toEqual([1080, 1350]);
    }
  }, 60_000);
});
