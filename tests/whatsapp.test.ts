import { describe, expect, it } from "vitest";
import { formatWhatsapp, normalizeWhatsapp } from "@/lib/whatsapp";

describe("nomor WhatsApp", () => {
  it("menormalkan berbagai format ke 62…", () => {
    expect(normalizeWhatsapp("0812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsapp("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsapp("6281234567890")).toBe("6281234567890");
    expect(normalizeWhatsapp("81234567890")).toBe("6281234567890");
  });
  it("menolak nomor tidak wajar", () => {
    expect(normalizeWhatsapp("12345")).toBeNull();
    expect(normalizeWhatsapp("021-5551234")).toBeNull();
    expect(normalizeWhatsapp("0812")).toBeNull();
    expect(normalizeWhatsapp("08123456789012345")).toBeNull();
    expect(normalizeWhatsapp("")).toBeNull();
  });
  it("format tampilan", () => {
    expect(formatWhatsapp("6281234567890")).toBe("+62 812-3456-7890");
  });
});
