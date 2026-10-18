import { NextResponse } from "next/server";
import { apiSession } from "@/lib/api";
import { CANVA_OAUTH_COOKIE, CANVA_OAUTH_COOKIE_PATH, canvaEnabled, canvaRedirectUri, startCanvaAuth } from "@/lib/connectors/canva";
import { OAUTH_COOKIE_TTL_SEC, safeReturnPath, withQueryParam } from "@/lib/connectors/oauth";

export const dynamic = "force-dynamic";

/** Mulai hubungkan Canva: simpan state + code_verifier di cookie bertanda tangan, lalu arahkan ke halaman izin Canva. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnPath = safeReturnPath(url.searchParams.get("return"));
  const back = (status: string) => NextResponse.redirect(new URL(withQueryParam(returnPath, "canva", status), url.origin));

  const s = await apiSession();
  if (s.error) {
    if (s.error.status === 401) {
      const login = new URL("/login", url.origin);
      login.searchParams.set("next", returnPath);
      return NextResponse.redirect(login);
    }
    return back("error");
  }
  if (!canvaEnabled()) return back("disabled");

  const { url: authorizeUrl, cookie } = startCanvaAuth({
    userId: s.user.id,
    returnPath,
    redirectUri: canvaRedirectUri(url.origin),
  });
  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(CANVA_OAUTH_COOKIE, cookie, {
    httpOnly: true,
    secure: url.protocol === "https:",
    // lax: cookie ikut terkirim saat Canva mengarahkan balik (navigasi top-level GET).
    sameSite: "lax",
    path: CANVA_OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_TTL_SEC,
  });
  return res;
}
