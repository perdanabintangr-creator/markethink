import { describe, expect, it } from "vitest";
import { detectMime, sanitizeFileName, summarizeCsv } from "@/lib/files";

describe("upload validation", () => {
  it("menolak PDF palsu", () => {
    expect(detectMime("a.pdf", "application/pdf", new TextEncoder().encode("not a pdf"))).toBeNull();
  });
  it("menerima PDF asli", () => {
    expect(detectMime("a.pdf", "application/pdf", new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
  });
  it("menolak ekstensi berbahaya", () => {
    expect(detectMime("x.exe", "application/octet-stream", new Uint8Array([0x4d, 0x5a]))).toBeNull();
    expect(detectMime("x.html", "text/html", new TextEncoder().encode("<script>"))).toBeNull();
  });
  it("gambar dideteksi dari magic bytes", () => {
    expect(detectMime("a.png", "image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe("image/png");
    expect(detectMime("a.png", "image/png", new TextEncoder().encode("hello"))).toBeNull();
  });
  it("teks biner ditolak", () => {
    expect(detectMime("a.txt", "text/plain", new Uint8Array([104, 0, 105]))).toBeNull();
  });
  it("sanitasi nama file", () => {
    expect(sanitizeFileName("../../etc/passwd")).not.toContain("/");
  });
  it("ringkasan CSV", () => {
    const out = summarizeCsv("produk,terjual\nA,10\nB,30\n");
    expect(out).toContain("2 baris, 2 kolom");
    expect(out).toContain("terjual: numerik, min 10, max 30");
    expect(out).toContain("produk: teks");
  });
});
