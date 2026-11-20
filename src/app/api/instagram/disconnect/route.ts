import { NextResponse } from "next/server";
import { apiSession } from "@/lib/api";
import { disconnectInstagram } from "@/lib/instagram";

/** Putuskan Instagram: hapus token & matikan posting otomatis. */
export async function POST() {
  const s = await apiSession();
  if (s.error) return s.error;
  await disconnectInstagram(s.user.id);
  return NextResponse.json({ ok: true });
}
