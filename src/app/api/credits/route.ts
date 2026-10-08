import { NextResponse } from "next/server";
import { apiSession } from "@/lib/api";
import { getCreditStatus } from "@/lib/credits";

export async function GET() {
  const s = await apiSession();
  if (s.error) return s.error;
  return NextResponse.json(await getCreditStatus(s.user.id));
}
