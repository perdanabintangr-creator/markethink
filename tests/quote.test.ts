import { describe, expect, it } from "vitest";
import { buildQuotedMessage, parseQuotedMessage } from "@/lib/quote";

describe("kutipan balasan", () => {
  it("bolak-balik: kutipan + pertanyaan", () => {
    const msg = buildQuotedMessage("Insight yang bisa dipelajari\n(dugaan saya)", "ini artinya apa ya?");
    expect(msg).toBe("> Insight yang bisa dipelajari\n> (dugaan saya)\n\nini artinya apa ya?");
    expect(parseQuotedMessage(msg)).toEqual({
      quote: "Insight yang bisa dipelajari\n(dugaan saya)",
      body: "ini artinya apa ya?",
    });
  });
  it("pesan biasa tidak berubah", () => {
    expect(parseQuotedMessage("halo")).toEqual({ quote: null, body: "halo" });
  });
});
