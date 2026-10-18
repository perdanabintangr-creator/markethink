import { NextResponse } from "next/server";
import { apiSession } from "@/lib/api";
import { connectorStatuses } from "@/lib/connectors/canva";

export const dynamic = "force-dynamic";

/** Status aplikasi terhubung milik user (tanpa token): aktif di server? sudah terhubung? */
export async function GET() {
  const s = await apiSession();
  if (s.error) return s.error;
  const apps = await connectorStatuses(s.user.id);
  return NextResponse.json({ apps }, { headers: { "Cache-Control": "private, no-store" } });
}
