import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardRequest } from "@/lib/ratelimit";
import { getToolAccess } from "@/lib/addons/access";
import { toolInfo } from "@/lib/addons/catalog";
import { consumeCredits, creditsForUsd, refundCredits, settleCredits } from "@/lib/credits";
import { interviewPersona, labBody, testWithPersonas, type Persona } from "@/lib/addons/persona-lab";
import type { ToolCtx } from "@/lib/addons/runtime";
import type { PersonaOutput } from "@/lib/addons/schemas";

export const maxDuration = 120;

/** Perkiraan kredit (1 kredit = Rp100) yang dipotong dulu, lalu disesuaikan ke biaya nyata. */
const ESTIMATE = { interview: 5, test: 25 } as const;
const MAX_TESTS_SAVED = 10;

/** Uji ke Calon Pembeli: wawancara persona / uji materi oleh semua persona dari hasil Segmentasi & Persona. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "invalid_id");
  if (!(await guardRequest(s.user.id, req.headers))) return jsonError(429, "rate_limited");
  const parsed = labBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body", { message: parsed.error.issues[0]?.message });
  const body = parsed.data;

  const admin = createAdminClient();
  const { data: run } = await admin.from("tool_runs").select("id, user_id, tool, status, input, output").eq("id", id).maybeSingle();
  if (!run || run.user_id !== s.user.id || run.tool !== "persona" || run.status !== "ok") return jsonError(404, "not_found");
  const output = run.output as PersonaOutput & { lab_tests?: unknown[] };
  const personas: Persona[] = output.personas ?? [];
  if (!personas.length) return jsonError(400, "no_personas");
  if (body.mode === "interview" && !personas[body.persona]) return jsonError(400, "unknown_persona");

  const en = s.profile.language === "en";
  const access = await getToolAccess(admin, s.profile, toolInfo("persona")?.addon);
  if (!access.isAdmin && !access.planAllowed)
    return jsonError(402, "plan_required", {
      message: en ? "Testing with buyers is available from the Starter plan." : "Uji ke Calon Pembeli tersedia mulai paket Starter.",
    });

  const estimate = ESTIMATE[body.mode];
  const charge = await consumeCredits(s.user.id, estimate, `persona_lab:${body.mode}`, { runId: id });
  if (!charge.ok)
    return jsonError(402, "credits_low", {
      message: en ? "Not enough quota left this month." : "Sisa kuota bulan ini tidak cukup. Kuota direset tiap tanggal 1.",
    });

  const ctx: ToolCtx = { admin, userId: s.user.id, runId: id, cost: { usd: 0, model: null }, startedAt: Date.now(), tier: "senior", lang: en ? "en" : "id" };
  const input = (run.input ?? {}) as Record<string, unknown>;
  const started = Date.now();
  try {
    let result: unknown;
    if (body.mode === "interview") {
      result = { reply: await interviewPersona(ctx, input, personas[body.persona], body.messages) };
    } else {
      const test = await testWithPersonas(ctx, input, personas, body);
      const saved = { ...test, kind: body.kind, variants: body.variants, at: new Date().toISOString() };
      const tests = [saved, ...(Array.isArray(output.lab_tests) ? output.lab_tests : [])].slice(0, MAX_TESTS_SAVED);
      await admin.from("tool_runs").update({ output: { ...output, lab_tests: tests } }).eq("id", id);
      result = { test: saved };
    }
    const credits = creditsForUsd(ctx.cost.usd);
    await settleCredits(s.user.id, estimate, credits, `persona_lab_settle:${body.mode}`, { runId: id });
    await admin.from("usage_logs").insert({
      user_id: s.user.id,
      tier: `tool:persona_lab_${body.mode}`,
      provider: ctx.cost.model?.split(":")[0] ?? null,
      model: ctx.cost.model?.split(":").slice(1).join(":") ?? null,
      est_cost_usd: ctx.cost.usd,
      credits,
      latency_ms: Date.now() - started,
      status: "ok",
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).slice(0, 1000);
    console.error("[persona-lab] gagal", msg);
    await refundCredits(s.user.id, estimate, `persona_lab_failed:${body.mode}`);
    await admin.from("usage_logs").insert({ user_id: s.user.id, tier: `tool:persona_lab_${body.mode}`, est_cost_usd: ctx.cost.usd, status: "error", error: msg });
    return jsonError(500, "lab_failed", { message: en ? "Something went wrong, your quota was not used. Please try again." : "Maaf, sedang bermasalah. Kuota tidak terpotong, coba lagi." });
  }
}
