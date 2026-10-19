import { describe, expect, it } from "vitest";
import { APP_FONTS, FONT_SCRIPT, fontById, googleFontsUrl } from "@/lib/fonts";

describe("fonts", () => {
  it("has unique ids and a default without Google Fonts", () => {
    expect(new Set(APP_FONTS.map((f) => f.id)).size).toBe(APP_FONTS.length);
    expect(fontById("default")?.google).toBeUndefined();
    expect(APP_FONTS.filter((f) => f.group === "fun").length).toBeGreaterThanOrEqual(4);
  });

  it("builds a Google Fonts URL only for web fonts", () => {
    expect(googleFontsUrl([fontById("default")!])).toBeNull();
    expect(googleFontsUrl([fontById("comic")!])).toBe("https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap");
  });

  it("head script is valid JavaScript", () => {
    expect(() => new Function(FONT_SCRIPT)).not.toThrow();
  });
});
