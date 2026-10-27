import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { labBody } = await import("@/lib/addons/persona-lab");

describe("Uji ke Calon Pembeli", () => {
  it("wawancara butuh persona & pesan", () => {
    expect(labBody.safeParse({ mode: "interview", persona: 0, messages: [{ role: "user", content: "Halo" }] }).success).toBe(true);
    expect(labBody.safeParse({ mode: "interview", persona: 0, messages: [] }).success).toBe(false);
  });
  it("uji materi butuh 2-3 versi", () => {
    expect(labBody.safeParse({ mode: "test", variants: ["versi satu", "versi dua"] }).success).toBe(true);
    expect(labBody.safeParse({ mode: "test", variants: ["hanya satu"] }).success).toBe(false);
    expect(labBody.safeParse({ mode: "test", variants: ["a1a", "b2b", "c3c", "d4d"] }).success).toBe(false);
  });
});
