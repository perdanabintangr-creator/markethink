import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import {
  CANVA_OAUTH_COOKIE,
  CANVA_OAUTH_COOKIE_PATH,
  canvaCookieSecret,
  canvaEnabled,
  canvaRedirectUri,
  exchangeCanvaCode,
  fetchCanvaDisplayName,
  saveCanvaTokens,
} from "@/lib/connectors/canva";
import { openOAuthCookie, safeReturnPath, sameState, withQueryParam } from "@/lib/connectors/oauth";

export const dynamic = "force-dynamic";

/** Canva mengarahkan balik ke sini: cek state & user, tukar code (PKCE) jadi token, simpan, kembali ke halaman asal. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const sealed = openOAuthCookie(jar.get(CANVA_OAUTH_COOKIE)?.value, canvaCookieSecret());
  const returnPath = safeReturnPath(sealed?.r);
  const back = (status: string) => {
    const res = NextResponse.redirect(new URL(withQueryParam(returnPath, "canva", status), url.origin));
    res.cookies.set(CANVA_OAUTH_COOKIE, "", { path: CANVA_OAUTH_COOKIE_PATH, maxAge: 0 });
    return res;
  };

  if (!canvaEnabled()) return back("disabled");
  // User menolak izin di Canva.
  if (url.searchParams.get("error")) return back(url.searchParams.get("error") === "access_denied" ? "denied" : "error");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!sealed || sealed.p !== "canva" || !code || !sameState(state, sealed.s)) return back("error");

  // Token hanya disimpan untuk user yang sama dengan yang memulai alur.
  const { user } = await getSession();
  if (!user || user.id !== sealed.u) return back("error");

  try {
    const tok = await exchangeCanvaCode(code, sealed.v, canvaRedirectUri(url.origin));
    const accountName = await fetchCanvaDisplayName(tok.access_token);
    await saveCanvaTokens(user.id, tok, accountName);
    return back("connected");
  } catch (err) {
    console.error("[canva] callback gagal", err instanceof Error ? err.message : String(err));
    return back("error");
  }
}
