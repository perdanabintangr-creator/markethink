import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";
import { finishBatch } from "@/lib/autopilot/finish";

export const maxDuration = 300;

/** Tahap akhir Autopilot (pemeriksaan tim senior + visual AI) untuk satu batch, dipanggil dari generator. */
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { userId?: unknown; batchId?: unknown } | null;
  const userId = String(body?.userId ?? "");
  const batchId = String(body?.batchId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f-]{36}$/i.test(batchId)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await finishBatch(createAdminClient(), userId, batchId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[autopilot] finish gagal", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
