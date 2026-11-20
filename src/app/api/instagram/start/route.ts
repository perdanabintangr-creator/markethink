import { NextResponse } from "next/server";
import { apiSession } from "@/lib/api";
import { autopilotAllowance } from "@/lib/autopilot/quota";
import { IG_OAUTH_COOKIE, IG_OAUTH_COOKIE_PATH, igAppId, igAppSecret, igEnabled, igRedirectUri } from "@/lib/instagram";
import { igAuthorizeUrl } from "@/lib/instagram-core";
import { createState, OAUTH_COOKIE_TTL_SEC, sealOAuthCookie } from "@/lib/connectors/oauth";

export const dynamic = "force-dynamic";

/** Mulai hubungkan Instagram: state anti-CSRF di cookie bertanda tangan, lalu ke halaman izin Instagram. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (status: string) => NextResponse.redirect(new URL(`/autopilot?ig=${status}`, url.origin));
  const s = await apiSession();
  if (s.error) {
    if (s.error.status === 401) return NextResponse.redirect(new URL("/login?next=/autopilot", url.origin));
    return back("error");
  }
  if (!igEnabled()) return back("disabled");
  if (!autopilotAllowance(s.profile.plan_id, s.profile.role)) return back("plan");
  const state = createState();
  const res = NextResponse.redirect(igAuthorizeUrl({ appId: igAppId(), redirectUri: igRedirectUri(url.origin), state }));
  res.cookies.set(IG_OAUTH_COOKIE, sealOAuthCookie({ p: "instagram", s: state, v: "none", u: s.user.id, r: "/autopilot" }, igAppSecret()), {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: IG_OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_TTL_SEC,
  });
  return res;
}
