import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Versi deploy yang sedang aktif (dibandingkan dengan versi yang dimuat browser). */
export function GET() {
  return NextResponse.json({ build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
