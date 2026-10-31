import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "@/lib/canonical";

const u = (s: string) => new URL(s);

describe("alamat utama (marqthink.com)", () => {
  it("halaman dari alamat lama dialihkan, path & query tetap", () => {
    expect(canonicalRedirect(u("https://markethink-pi.vercel.app/chat/abc?x=1"), "GET", "marqthink.com")).toBe("https://marqthink.com/chat/abc?x=1");
    expect(canonicalRedirect(u("https://www.marqthink.com/pricing"), "GET", "marqthink.com")).toBe("https://marqthink.com/pricing");
  });
  it("tidak dialihkan: API, POST, alamat utama, preview, tanpa env", () => {
    expect(canonicalRedirect(u("https://markethink-pi.vercel.app/api/connectors/canva/callback?code=1"), "GET", "marqthink.com")).toBeNull();
    expect(canonicalRedirect(u("https://markethink-pi.vercel.app/login"), "POST", "marqthink.com")).toBeNull();
    expect(canonicalRedirect(u("https://marqthink.com/chat"), "GET", "marqthink.com")).toBeNull();
    expect(canonicalRedirect(u("https://markethink-git-abc-team.vercel.app/chat"), "GET", "marqthink.com")).toBeNull();
    expect(canonicalRedirect(u("https://markethink-pi.vercel.app/chat"), "GET", "")).toBeNull();
  });
});
