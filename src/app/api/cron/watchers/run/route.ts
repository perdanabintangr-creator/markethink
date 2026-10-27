import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";
import { runWatcher } from "@/lib/addons/watchers";

export const maxDuration = 300;

/** Jalankan satu pemantauan mingguan (dipanggil oleh /api/cron/watchers). */
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = String(body?.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    return NextResponse.json(await runWatcher(createAdminClient(), id));
  } catch (err) {
    console.error("[watch] gagal", id, err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
