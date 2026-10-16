import { afterEach, describe, expect, it, vi } from "vitest";

// DNS tiruan: *.internal-redirect.test → IP privat; selain itu IP publik.
vi.mock("node:dns/promises", () => ({
  lookup: async (host: string) => [{ address: host.startsWith("evil.") ? "10.0.0.5" : "93.184.216.34", family: 4 }],
}));
const { readLink } = await import("@/lib/ai/links");

type Route = { status?: number; type?: string; body?: string; location?: string };
function mockFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (input: URL | string) => {
    const url = String(input);
    calls.push(url);
    const r = routes[url];
    if (!r) return new Response("not found", { status: 404, headers: { "content-type": "text/html" } });
    const headers: Record<string, string> = { "content-type": r.type ?? "text/html; charset=utf-8" };
    if (r.location) headers.location = r.location;
    return new Response(r.body ?? "", { status: r.status ?? 200, headers });
  });
  return calls;
}
afterEach(() => vi.unstubAllGlobals());

const article = `<html><head><title>Strategi Kopi 2026</title><meta name="description" content="Tren kopi susu &amp; promo"></head>
<body><nav>menu</nav><article><h1>Strategi Kopi</h1><p>${"Penjualan kopi susu naik 30% di Jakarta. ".repeat(20)}</p></article><footer>f</footer></body></html>`;

describe("readLink (jaringan tiruan)", () => {
  it("artikel web → judul, ringkasan & isi bersih", async () => {
    mockFetch({ "https://blog.example.com/kopi": { body: article } });
    const r = await readLink("https://blog.example.com/kopi");
    expect(r).toMatchObject({ ok: true, kind: "web", title: "Strategi Kopi 2026", host: "blog.example.com" });
    expect(r.text).toContain("Ringkasan halaman: Tren kopi susu & promo");
    expect(r.text).toContain("Penjualan kopi susu naik 30%");
    expect(r.text).not.toContain("menu");
  });

  it("pengalihan ke alamat internal diblokir", async () => {
    mockFetch({ "https://short.example.com/x": { status: 302, location: "http://evil.example.com/admin" } });
    const r = await readLink("https://short.example.com/x");
    expect(r).toMatchObject({ ok: false, note: "Alamat ini tidak diizinkan." });
  });

  it("pengalihan biasa diikuti", async () => {
    const calls = mockFetch({ "https://s.example.com/a": { status: 301, location: "/b" }, "https://s.example.com/b": { body: article } });
    expect((await readLink("https://s.example.com/a")).ok).toBe(true);
    expect(calls).toEqual(["https://s.example.com/a", "https://s.example.com/b"]);
  });

  it("Google Docs privat → minta dibagikan publik", async () => {
    mockFetch({
      "https://docs.google.com/document/d/D1/export?format=txt": { status: 302, location: "https://accounts.google.com/ServiceLogin?continue=x" },
      "https://accounts.google.com/ServiceLogin?continue=x": { body: "<html>login</html>" },
    });
    const r = await readLink("https://docs.google.com/document/d/D1/edit");
    expect(r).toMatchObject({ ok: false, kind: "private" });
  });

  it("Google Docs publik → teks", async () => {
    mockFetch({ "https://docs.google.com/document/d/D2/export?format=txt": { type: "text/plain", body: "Brief campaign Ramadan: target Gen Z" } });
    const r = await readLink("https://docs.google.com/document/d/D2/edit?usp=sharing");
    expect(r).toMatchObject({ ok: true, kind: "google" });
    expect(r.text).toContain("Brief campaign Ramadan");
  });

  it("halaman JavaScript kosong → jujur tidak terbaca", async () => {
    mockFetch({ "https://app.example.com/": { body: "<html><head><title>App</title></head><body><div id=root></div></body></html>" } });
    const r = await readLink("https://app.example.com/");
    expect(r.ok).toBe(false);
    expect(r.note).toContain("JavaScript");
  });

  it("YouTube → judul & deskripsi saja", async () => {
    const v = "https://www.youtube.com/watch?v=abc";
    mockFetch({
      [`https://www.youtube.com/oembed?url=${encodeURIComponent(v)}&format=json`]: { type: "application/json", body: JSON.stringify({ title: "Review Kopi", author_name: "KopiTV" }) },
      [v]: { body: '<meta property="og:description" content="Ulasan 5 kopi susu">' },
    });
    const r = await readLink(v);
    expect(r).toMatchObject({ ok: true, kind: "video", title: "Review Kopi" });
    expect(r.text).toContain("Ulasan 5 kopi susu");
    expect(r.text).toContain("transkrip");
  });

  it("404 → alasan jelas", async () => {
    mockFetch({});
    const r = await readLink("https://example.com/hilang");
    expect(r).toMatchObject({ ok: false });
    expect(r.note).toContain("404");
  });
});
