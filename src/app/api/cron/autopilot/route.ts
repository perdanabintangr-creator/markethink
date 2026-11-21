import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";
import { autopilotAllowance } from "@/lib/autopilot/quota";
import { addDays, todayWib } from "@/lib/autopilot/plan";
import { needsBatch } from "@/lib/autopilot/schedule";
import { igEnabled, refreshInstagramTokens, syncAllInsights } from "@/lib/instagram";

export const maxDuration = 60;

/**
 * Cron harian (vercel.json, 03.10 WIB): untuk tiap pelanggan yang menyalakan Autopilot, bila stok konten kurang
 * (mingguan: < 4 hari ke depan, bulanan: < 21 hari), buat satu minggu berikutnya di request terpisah.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createAdminClient();
  // Perpanjang token Instagram yang akan habis (token jangka panjang berlaku ±60 hari).
  const refreshed = igEnabled() ? await refreshInstagramTokens().catch(() => 0) : 0;
  // Statistik post untuk "belajar dari performa" (sebelum konten minggu berikutnya dibuat).
  if (igEnabled()) await syncAllInsights(25_000).catch(() => 0);
  const { data: settings } = await admin
    .from("autopilot_settings")
    .select("user_id, cadence")
    .eq("enabled", true)
    .order("last_generated_at", { ascending: true, nullsFirst: true })
    .limit(200);
  if (!settings?.length) return NextResponse.json({ ok: true, started: 0, refreshed });
  const ids = settings.map((s) => s.user_id as string);
  const [{ data: profiles }, { data: last }] = await Promise.all([
    admin.from("profiles").select("id, plan_id, role, banned").in("id", ids),
    admin.from("social_posts").select("user_id, post_date").in("user_id", ids).neq("status", "rejected").gte("post_date", addDays(todayWib(), -1)),
  ]);
  const until = new Map<string, string>();
  // Ide yang masih menunggu ditinjau juga dihitung sebagai stok konten.
  const { data: pendingIdeas } = await admin.from("autopilot_ideas").select("user_id, post_date").in("user_id", ids).eq("status", "pending");
  for (const r of [...(last ?? []), ...(pendingIdeas ?? [])]) {
    const u = r.user_id as string;
    if (!until.has(u) || String(r.post_date) > until.get(u)!) until.set(u, String(r.post_date));
  }
  const due = settings
    .filter((s) => {
      const p = profiles?.find((x) => x.id === s.user_id);
      return p && !p.banned && autopilotAllowance(p.plan_id as string, p.role as string);
    })
    .filter((s) => needsBatch(s.cadence as "weekly" | "monthly", until.get(s.user_id as string) ?? null, todayWib()))
    .slice(0, 40)
    .map((s) => s.user_id as string);
  // Ide yang menunggu ditinjau > 24 jam → ditulis otomatis supaya jadwal tidak macet.
  const { data: stalled } = await admin
    .from("autopilot_ideas")
    .select("user_id")
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - 24 * 3_600_000).toISOString())
    .limit(200);
  const writeUsers = [...new Set((stalled ?? []).map((r) => r.user_id as string))].slice(0, 20);
  const origin = new URL(req.url).origin;
  await Promise.all(
    writeUsers.map((userId) =>
      fetch(`${origin}/api/cron/autopilot/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId, write: true }),
        signal: AbortSignal.timeout(2500),
      }).catch(() => null),
    ),
  );
  await Promise.all(
    due.map((userId) =>
      fetch(`${origin}/api/cron/autopilot/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        signal: AbortSignal.timeout(2500),
      }).catch(() => null),
    ),
  );
  return NextResponse.json({ ok: true, started: due.length, refreshed });
}
