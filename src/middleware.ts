import { NextResponse, type NextRequest } from "next/server";
import { canonicalRedirect } from "@/lib/canonical";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const target = canonicalRedirect(request.nextUrl, request.method);
  if (target) return NextResponse.redirect(target, 308);
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
