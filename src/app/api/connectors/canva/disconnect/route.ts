import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { disconnectCanva } from "@/lib/connectors/canva";

/** Putuskan Canva dari akun Marqthink (token dicabut di Canva & dihapus dari database). */
export async function POST() {
  const s = await apiSession();
  if (s.error) return s.error;
  try {
    await disconnectCanva(s.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[canva] disconnect gagal", err instanceof Error ? err.message : String(err));
    return jsonError(500, "disconnect_failed");
  }
}
