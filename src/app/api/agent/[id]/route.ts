import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAgentRun } from "@/lib/agent/server";

/** Detail misi + ringkas hasil tiap langkah (judul, file). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const admin = createAdminClient();
  const run = await loadAgentRun(admin, id, s.user.id);
  if (!run) return jsonError(404, "not_found");
  const ids = run.plan.map((p) => p.run_id).filter(Boolean) as string[];
  const { data: results } = ids.length
    ? await admin.from("tool_runs").select("id, tool, title, files, status").in("id", ids).eq("user_id", s.user.id)
    : { data: [] };
  return NextResponse.json({ run, results: results ?? [] });
}

const patch = z.object({ remove: z.number().int().min(0).max(10) });

/** Sebelum dijalankan: user boleh membuang langkah yang tidak diperlukan. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const admin = createAdminClient();
  const run = await loadAgentRun(admin, id, s.user.id);
  if (!run) return jsonError(404, "not_found");
  const step = run.plan[parsed.data.remove];
  if (!step || step.status !== "pending") return jsonError(409, "step_locked", { message: "Langkah ini sudah berjalan." });
  if (run.plan.filter((p) => p.status !== "skipped").length <= 1) return jsonError(400, "last_step", { message: "Minimal satu langkah." });
  const plan = run.plan.map((p, i) => (i === parsed.data.remove ? { ...p, status: "skipped" as const } : p));
  await admin.from("agent_runs").update({ plan, updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}

/** Hapus misi dari riwayat (hasil tiap tool tetap ada di Riwayat Tools Pro). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const { error } = await createAdminClient().from("agent_runs").delete().eq("id", id).eq("user_id", s.user.id);
  if (error) return jsonError(400, "delete_failed");
  return NextResponse.json({ ok: true });
}
