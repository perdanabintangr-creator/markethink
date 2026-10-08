import "server-only";
import { NextResponse } from "next/server";
import { getSession, hasAppAccess } from "@/lib/auth";

export const jsonError = (status: number, error: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

/** Session untuk route API: 401 jika belum login, 403 jika di-ban. */
export async function apiSession() {
  const session = await getSession();
  if (!session.user || !session.profile) return { error: jsonError(401, "unauthorized") } as const;
  if (session.profile.banned) return { error: jsonError(403, "banned") } as const;
  if (!(await hasAppAccess(session.profile))) return { error: jsonError(403, "no_access") } as const;
  return { ...session, user: session.user, profile: session.profile, error: null } as const;
}
