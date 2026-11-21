import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";
import { generateWeek, writePendingIdeas } from "@/lib/autopilot/generate";

export const maxDuration = 300;

/** Buat satu minggu konten Autopilot untuk satu pelanggan (dipanggil oleh /api/cron/autopilot). */
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { userId?: unknown; write?: unknown } | null;
  const userId = String(body?.userId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ ok: false }, { status: 400 });
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("plan_id, role, language, full_name, banned").eq("id", userId).maybeSingle();
  if (!p || p.banned) return NextResponse.json({ ok: false }, { status: 404 });
  const fn = body?.write ? writePendingIdeas : generateWeek;
  const res = await fn(admin, {
    userId,
    planId: p.plan_id as string,
    role: p.role as string,
    language: (p.language as "id" | "en") ?? "id",
    fullName: p.full_name as string | null,
    source: "cron",
  });
  return NextResponse.json(res);
}
