import { afterEach, describe, expect, it } from "vitest";
import {
  basicAuthHeader,
  buildAuthorizeUrl,
  canvaTitleBase64,
  codeChallengeS256,
  createCodeVerifier,
  createState,
  fitCanvaDimensions,
  openOAuthCookie,
  safeReturnPath,
  sameState,
  sealOAuthCookie,
  withQueryParam,
} from "@/lib/connectors/oauth";
import {
  CONNECTOR_APPS,
  attachmentIdFromUrl,
  connectUrlFor,
  filterApps,
  findMention,
  insertMention,
  mentionsApp,
  removeMention,
  splitMentions,
} from "@/lib/connectors/apps";
import { CANVA_AUTHORIZE_URL, CANVA_SCOPES, canvaEnabled, canvaFileKind, canvaRedirectUri } from "@/lib/connectors/canva";
import { connectorsText } from "@/lib/i18n/connectors";

const canva = CONNECTOR_APPS.find((a) => a.id === "canva")!;

describe("PKCE & state", () => {
  it("code_challenge S256 sesuai contoh RFC 7636", () => {
    expect(codeChallengeS256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("code_verifier 43 sampai 128 karakter base64url & acak", () => {
    const a = createCodeVerifier();
    const b = createCodeVerifier();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(a).not.toBe(b);
    expect(createState()).toMatch(/^[A-Za-z0-9_-]{40,}$/);
  });

  it("sameState membandingkan persis", () => {
    expect(sameState("abc", "abc")).toBe(true);
    expect(sameState("abc", "abd")).toBe(false);
    expect(sameState("abc", "abcd")).toBe(false);
    expect(sameState(null, "abc")).toBe(false);
    expect(sameState("", "")).toBe(false);
  });
});

describe("cookie OAuth bertanda tangan", () => {
  const payload = { p: "canva", s: "state-1", v: "verifier-1", u: "user-1", r: "/chat/abc" };

  it("bolak-balik", () => {
    const sealed = sealOAuthCookie(payload, "secret");
    const opened = openOAuthCookie(sealed, "secret");
    expect(opened).toMatchObject(payload);
  });

  it("menolak secret salah, isi diubah, dan format rusak", () => {
    const sealed = sealOAuthCookie(payload, "secret");
    expect(openOAuthCookie(sealed, "other")).toBeNull();
    const [body, sig] = sealed.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), u: "attacker" })).toString("base64url");
    expect(openOAuthCookie(`${forged}.${sig}`, "secret")).toBeNull();
    expect(openOAuthCookie("garbage", "secret")).toBeNull();
    expect(openOAuthCookie(undefined, "secret")).toBeNull();
    expect(openOAuthCookie(sealed, "")).toBeNull();
  });

  it("kedaluwarsa setelah 10 menit", () => {
    const t0 = Date.UTC(2026, 9, 18, 10, 0, 0);
    const sealed = sealOAuthCookie(payload, "secret", t0);
    expect(openOAuthCookie(sealed, "secret", t0 + 9 * 60_000)).not.toBeNull();
    expect(openOAuthCookie(sealed, "secret", t0 + 11 * 60_000)).toBeNull();
  });
});

describe("path kembali yang aman", () => {
  it("menerima path relatif situs ini", () => {
    expect(safeReturnPath("/chat/123")).toBe("/chat/123");
    expect(safeReturnPath("/settings?tab=aplikasi")).toBe("/settings?tab=aplikasi");
  });

  it("menolak URL luar & trik open redirect", () => {
    const fb = "/settings?tab=aplikasi";
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com/x", "/ok\nx", "", null, undefined]) {
      expect(safeReturnPath(bad)).toBe(fb);
    }
    expect(safeReturnPath("//evil.com", "/chat")).toBe("/chat");
  });

  it("withQueryParam menambah/mengganti parameter", () => {
    expect(withQueryParam("/chat/1", "canva", "connected")).toBe("/chat/1?canva=connected");
    expect(withQueryParam("/settings?tab=aplikasi", "canva", "error")).toBe("/settings?tab=aplikasi&canva=error");
    expect(withQueryParam("/x?canva=old#h", "canva", "connected")).toBe("/x?canva=connected#h");
  });
});

describe("URL izin Canva", () => {
  it("memuat semua parameter PKCE", () => {
    const url = new URL(
      buildAuthorizeUrl({
        authorizeUrl: CANVA_AUTHORIZE_URL,
        clientId: "OC-test",
        redirectUri: "https://markethink-pi.vercel.app/api/connectors/canva/callback",
        scopes: CANVA_SCOPES,
        state: "st",
        codeChallenge: "ch",
      }),
    );
    expect(`${url.origin}${url.pathname}`).toBe("https://www.canva.com/api/oauth/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe("ch");
    expect(url.searchParams.get("client_id")).toBe("OC-test");
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("redirect_uri")).toBe("https://markethink-pi.vercel.app/api/connectors/canva/callback");
    expect(url.searchParams.get("scope")).toBe("asset:read asset:write design:content:write profile:read");
  });

  it("Basic auth = base64(client_id:client_secret)", () => {
    expect(basicAuthHeader("id", "secret")).toBe(`Basic ${Buffer.from("id:secret").toString("base64")}`);
  });
});

describe("helper Canva", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("judul base64 sesuai contoh spec & dipotong 50 karakter", () => {
    expect(canvaTitleBase64("My Awesome Design 😍")).toBe("TXkgQXdlc29tZSBEZXNpZ24g8J+YjQ==");
    const long = Buffer.from(canvaTitleBase64("a".repeat(80)), "base64").toString("utf8");
    expect(long).toHaveLength(50);
    expect(Buffer.from(canvaTitleBase64("  "), "base64").toString("utf8")).toBe("Markethink");
  });

  it("ukuran desain custom dalam batas Canva", () => {
    expect(fitCanvaDimensions(1080, 1350)).toEqual({ width: 1080, height: 1350 });
    const big = fitCanvaDimensions(10000, 10000);
    expect(big.width).toBeLessThanOrEqual(8000);
    expect(big.width * big.height).toBeLessThanOrEqual(25_000_000);
    const small = fitCanvaDimensions(20, 10);
    expect(small.width).toBeGreaterThanOrEqual(40);
    expect(small.height).toBeGreaterThanOrEqual(40);
    const wide = fitCanvaDimensions(16000, 100);
    expect(wide.width).toBeLessThanOrEqual(8000);
    expect(wide.height).toBeGreaterThanOrEqual(40);
  });

  it("jenis file", () => {
    expect(canvaFileKind("application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("design");
    expect(canvaFileKind("application/pdf")).toBe("design");
    expect(canvaFileKind("image/png")).toBe("image");
    expect(canvaFileKind("image/webp")).toBe("image");
    expect(canvaFileKind("application/zip")).toBeNull();
    expect(canvaFileKind("application/json")).toBeNull();
  });

  it("aktif hanya bila client id & secret terisi", () => {
    delete process.env.CANVA_CLIENT_ID;
    delete process.env.CANVA_CLIENT_SECRET;
    expect(canvaEnabled()).toBe(false);
    process.env.CANVA_CLIENT_ID = "OC-x";
    expect(canvaEnabled()).toBe(false);
    process.env.CANVA_CLIENT_SECRET = "cnvca-x";
    expect(canvaEnabled()).toBe(true);
  });

  it("redirect URI memakai NEXT_PUBLIC_APP_URL lalu origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://markethink-pi.vercel.app/";
    expect(canvaRedirectUri("http://localhost:3000")).toBe("https://markethink-pi.vercel.app/api/connectors/canva/callback");
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(canvaRedirectUri("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000/api/connectors/canva/callback");
  });
});

describe("mention @ di kotak chat", () => {
  it("terdeteksi di awal teks atau setelah spasi", () => {
    expect(findMention("@", 1)).toEqual({ start: 0, query: "" });
    expect(findMention("tolong @can", 11)).toEqual({ start: 7, query: "can" });
    expect(findMention("baris\n@Ca", 9)).toEqual({ start: 6, query: "Ca" });
  });

  it("tidak terdeteksi di email, setelah spasi, atau kursor jauh", () => {
    expect(findMention("halo@canva", 10)).toBeNull();
    expect(findMention("@canva ", 7)).toBeNull();
    expect(findMention("tanpa mention", 5)).toBeNull();
    expect(findMention("@canva", 99)).toBeNull();
  });

  it("filter aplikasi", () => {
    expect(filterApps("").map((a) => a.id)).toEqual(["canva"]);
    expect(filterApps("CA").map((a) => a.id)).toEqual(["canva"]);
    expect(filterApps("figma")).toEqual([]);
  });

  it("sisipkan mention + spasi dan posisi kursor", () => {
    expect(insertMention("@ca", 0, 3, "@Canva")).toEqual({ text: "@Canva ", caret: 7 });
    expect(insertMention("edit @c tolong", 5, 7, "@Canva")).toEqual({ text: "edit @Canva tolong", caret: 12 });
    expect(insertMention("edit @canv", 5, 8, "@Canva")).toEqual({ text: "edit @Canva ", caret: 12 });
  });

  it("mentionsApp", () => {
    expect(mentionsApp("@Canva tolong edit", canva)).toBe(true);
    expect(mentionsApp("kirim ke @canva ya", canva)).toBe(true);
    expect(mentionsApp("email saya a@canva.com", canva)).toBe(false);
    expect(mentionsApp("@Canvas", canva)).toBe(false);
  });

  it("id lampiran dari URL & URL hubungkan", () => {
    const id = "3f2b8c1e-1234-4abc-9def-0123456789ab";
    expect(attachmentIdFromUrl(`/api/attachments/${id}`)).toBe(id);
    expect(attachmentIdFromUrl(id.toUpperCase())).toBe(id);
    expect(attachmentIdFromUrl("bukan-id")).toBeNull();
    expect(attachmentIdFromUrl(undefined)).toBeNull();
    expect(connectUrlFor("canva", "/chat/1?x=1")).toBe("/api/connectors/canva/start?return=%2Fchat%2F1%3Fx%3D1");
  });
});

describe("teks konektor", () => {
  const collect = (v: unknown): string[] =>
    typeof v === "string" ? [v] : typeof v === "function" ? [String((v as (s: string) => string)("X"))] : v && typeof v === "object" ? Object.values(v).flatMap(collect) : [];

  it("ID & EN lengkap dan tanpa em/en dash", () => {
    const id = connectorsText("id");
    const en = connectorsText("en");
    expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort());
    expect(Object.keys(en.errors).sort()).toEqual(Object.keys(id.errors).sort());
    for (const s of [...collect(id), ...collect(en), ...CONNECTOR_APPS.flatMap((a) => [a.description.id, a.description.en])]) {
      expect(s, s).not.toMatch(/[–—]/);
    }
  });
});

describe("lencana mention aplikasi", () => {
  const canva = CONNECTOR_APPS[0];
  it("memecah @Canva jadi lencana, tidak menyentuh email", () => {
    const parts = splitMentions("@canva kirim ini ya, cc halo@canva.com");
    expect(parts[0]).toEqual({ app: canva });
    expect(parts.filter((p) => "app" in p)).toHaveLength(1);
    expect(parts.map((p) => ("text" in p ? p.text : "#")).join("")).toBe("# kirim ini ya, cc halo@canva.com");
  });
  it("tombol × menghapus mention", () => {
    expect(removeMention("@Canva saya mau edit", canva)).toBe("saya mau edit");
    expect(removeMention("tolong @Canva kirim", canva)).toBe("tolong kirim");
  });
});
