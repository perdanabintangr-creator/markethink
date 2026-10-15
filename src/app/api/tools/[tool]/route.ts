import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardRequest } from "@/lib/ratelimit";
import { toolInfo } from "@/lib/addons/catalog";
import { isAiTool } from "@/lib/addons/tools";
import { executeTool } from "@/lib/addons/execute";
import { resolveToolTier } from "@/lib/addons/tool-tier";
import { getAllowedTiers } from "@/lib/plan";

export const maxDuration = 300;

/** Jalankan tool add-on (atau revisinya lewat `__revise`). Logika inti ada di executeTool. */
export async function POST(req: Request, { params }: { params: Promise<{ tool: string }> }) {
  const startedAt = Date.now();
  const s = await apiSession();
  if (s.error) return s.error;
  const { tool } = await params;
  if (!toolInfo(tool) || !isAiTool(tool)) return jsonError(404, "unknown_tool");
  if (!(await guardRequest(s.user.id, req.headers))) return jsonError(429, "rate_limited");

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const revise = body?.__revise as { runId?: unknown; note?: unknown } | undefined;
  const res = await executeTool({
    admin: createAdminClient(),
    profile: s.profile,
    tool,
    rawInput: body,
    revise: revise ? { runId: String(revise.runId ?? ""), note: String(revise.note ?? "") } : undefined,
    startedAt,
    tier: resolveToolTier(body?.__tier, await getAllowedTiers(s.supabase, s.profile)),
  });
  if (res.ok) return NextResponse.json({ runId: res.runId });
  return jsonError(res.status, res.code, {
    ...(res.message ? { message: res.message } : {}),
    ...(res.addon ? { addon: res.addon } : {}),
  });
}
