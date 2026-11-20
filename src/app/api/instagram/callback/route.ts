import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { connectInstagram, IG_OAUTH_COOKIE, IG_OAUTH_COOKIE_PATH, igAppSecret, igEnabled, igRedirectUri, saveInstagram, syncInsights } from "@/lib/instagram";
import { canPublish } from "@/lib/instagram-core";
import { openOAuthCookie, sameState } from "@/lib/connectors/oauth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Instagram mengarahkan balik ke sini: cek state & user, tukar code jadi token jangka panjang, simpan terenkripsi. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const sealed = openOAuthCookie(jar.get(IG_OAUTH_COOKIE)?.value, igAppSecret());
  const back = (status: string) => {
    const res = NextResponse.redirect(new URL(`/autopilot?ig=${status}`, url.origin));
    res.cookies.set(IG_OAUTH_COOKIE, "", { path: IG_OAUTH_COOKIE_PATH, maxAge: 0 });
    return res;
  };
  if (!igEnabled()) return back("disabled");
  if (url.searchParams.get("error")) return back(url.searchParams.get("error_reason") === "user_denied" || url.searchParams.get("error") === "access_denied" ? "denied" : "error");
  const code = url.searchParams.get("code");
  if (!sealed || sealed.p !== "instagram" || !code || !sameState(url.searchParams.get("state"), sealed.s)) return back("error");
  const { user } = await getSession();
  if (!user || user.id !== sealed.u) return back("error");
  try {
    const c = await connectInstagram(code, igRedirectUri(url.origin));
    if (!canPublish(c.accountType)) return back("personal");
    await saveInstagram(user.id, c);
    // Statistik awal (maks ±15 detik) supaya minggu pertama langsung belajar dari post lama.
    await syncInsights(user.id, { budgetMs: 15_000 }).catch((err) => console.warn("[instagram] sinkron awal gagal", String(err).slice(0, 200)));
    return back("connected");
  } catch (err) {
    console.error("[instagram] callback gagal", err instanceof Error ? err.message.slice(0, 300) : String(err));
    return back("error");
  }
}
