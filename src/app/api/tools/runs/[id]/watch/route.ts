import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { getToolAccess } from "@/lib/addons/access";
import { MAX_WATCHERS, isWatchable, nextWeek } from "@/lib/addons/watchers";

async function load(id: string) {
  const s = await apiSession();
  if (s.error) return { error: s.error } as const;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: jsonError(400, "invalid_id") } as const;
  const admin = createAdminClient();
  const { data: run } = await admin.from("tool_runs").select("id, user_id, tool, status, input, title, revision_of").eq("id", id).maybeSingle();
  if (!run || run.user_id !== s.user.id) return { error: jsonError(404, "not_found") } as const;
  return { s, admin, run, error: null } as const;
}

/** Pemantauan aktif untuk hasil ini (hasil asal, atau hasil yang dibuat oleh pemantauan itu sendiri). */
async function findWatcher(admin: ReturnType<typeof createAdminClient>, userId: string, runId: string) {
  const { data } = await admin
    .from("tool_watchers")
    .select("id, active, next_run_at, last_run_at, last_status")
    .eq("user_id", userId)
    .eq("active", true)
    .or(`source_run_id.eq.${runId},last_run_id.eq.${runId}`)
    .maybeSingle();
  return data;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await load((await params).id);
  if (r.error) return r.error;
  return NextResponse.json({ watcher: await findWatcher(r.admin, r.s.user.id, r.run.id) });
}

/** Mulai pantau mingguan dari hasil ini (Pro ke atas, maks 3 pemantauan aktif). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await load((await params).id);
  if (r.error) return r.error;
  const { s, admin, run } = r;
  const en = s.profile.language === "en";
  if (!isWatchable(run.tool) || run.status !== "ok") return jsonError(400, "not_watchable");
  const access = await getToolAccess(admin, s.profile);
  if (!access.isAdmin && !access.agent)
    return jsonError(402, "plan_required", { message: en ? "Weekly monitoring is available from the Pro plan." : "Pantau mingguan tersedia mulai paket Pro." });
  if (await findWatcher(admin, s.user.id, run.id)) return NextResponse.json({ ok: true });
  const { count } = await admin.from("tool_watchers").select("id", { count: "exact", head: true }).eq("user_id", s.user.id).eq("active", true);
  if ((count ?? 0) >= MAX_WATCHERS)
    return jsonError(429, "watch_limit", {
      message: en ? `You can monitor up to ${MAX_WATCHERS} results at once. Stop one first.` : `Maksimal ${MAX_WATCHERS} pemantauan aktif. Hentikan salah satu dulu.`,
    });
  const { data, error } = await admin
    .from("tool_watchers")
    .insert({ user_id: s.user.id, tool: run.tool, input: run.input, title: run.title, source_run_id: run.id, next_run_at: nextWeek() })
    .select("id, active, next_run_at, last_run_at, last_status")
    .single();
  if (error) return jsonError(500, "save_failed");
  return NextResponse.json({ watcher: data });
}

/** Hentikan pemantauan. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await load((await params).id);
  if (r.error) return r.error;
  const w = await findWatcher(r.admin, r.s.user.id, r.run.id);
  if (w) await r.admin.from("tool_watchers").update({ active: false }).eq("id", w.id);
  return NextResponse.json({ ok: true });
}
