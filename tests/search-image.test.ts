import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { serperSearch, webSearch } = await import("@/lib/ai/research");
const { imagenAspect } = await import("@/lib/ai/image");

describe("Serper (Riset Web murah)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SERPER_API_KEY;
  });

  it("mengubah hasil Google jadi sumber bernomor, tanpa duplikat", async () => {
    process.env.SERPER_API_KEY = "test";
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          answerBox: { title: "Harga", answer: "Rp40.000", link: "https://a.id" },
          organic: [
            { title: "A", link: "https://a.id", snippet: "dobel" },
            { title: "B", link: "https://b.id", snippet: "isi b", date: "1 Okt 2026" },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await serperSearch("harga photobox jakarta");
    expect(res.map((r) => r.url)).toEqual(["https://a.id", "https://b.id"]);
    expect(res[0]).toMatchObject({ id: 1, content: "Rp40.000" });
    expect(res[1]).toMatchObject({ id: 2, publishedDate: "1 Okt 2026" });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ gl: "id", hl: "id" });
  });

  it("webSearch memakai Serper bila kuncinya ada", async () => {
    process.env.SERPER_API_KEY = "test";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ organic: [{ title: "X", link: "https://x.id", snippet: "s" }] })));
    vi.stubGlobal("fetch", fetchMock);
    await webSearch("x");
    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain("serper.dev");
  });
});

describe("Imagen", () => {
  it("rasio yang tidak didukung dipetakan ke yang terdekat", () => {
    expect(imagenAspect("4:5")).toBe("3:4");
    expect(imagenAspect("9:16")).toBe("9:16");
    expect(imagenAspect("2:1")).toBe("1:1");
  });
});

describe("baca isi halaman", async () => {
  const { htmlToText, fetchPageText } = await import("@/lib/ai/research");
  it("membersihkan HTML jadi teks (tanpa skrip/menu)", () => {
    const t = htmlToText("<html><nav>Menu</nav><script>x()</script><main><h1>Harga Paket</h1><p>Basic Rp35.000 &amp; Premium Rp50.000</p></main></html>");
    expect(t).toContain("Harga Paket");
    expect(t).toContain("Basic Rp35.000 & Premium Rp50.000");
    expect(t).not.toContain("Menu");
    expect(t).not.toContain("x()");
  });
  it("melewati situs media sosial", async () => {
    expect(await fetchPageText("https://www.instagram.com/p/abc")).toBeNull();
  });
});
