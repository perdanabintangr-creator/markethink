import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";

export const maxDuration = 60;

/**
 * Cron harian (vercel.json): ambil pemantauan yang jatuh tempo, klaim, lalu jalankan masing-masing di request terpisah
 * (tiap tool bisa butuh beberapa menit, jadi tidak dijalankan berurutan di sini).
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createAdminClient();
  const { data: due } = await admin.from("tool_watchers").select("id").eq("active", true).lte("next_run_at", new Date().toISOString()).order("next_run_at").limit(20);
  const ids = (due ?? []).map((d) => d.id as string);
  if (!ids.length) return NextResponse.json({ ok: true, started: 0 });
  // Klaim: geser 6 jam supaya tidak dijalankan dua kali bila cron terpanggil ulang.
  await admin.from("tool_watchers").update({ next_run_at: new Date(Date.now() + 6 * 3_600_000).toISOString() }).in("id", ids);
  const origin = new URL(req.url).origin;
  await Promise.all(
    ids.map((id) =>
      fetch(`${origin}/api/cron/watchers/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        // Tidak menunggu selesai: proses tool berjalan di request-nya sendiri.
        signal: AbortSignal.timeout(2500),
      }).catch(() => null),
    ),
  );
  return NextResponse.json({ ok: true, started: ids.length });
}
