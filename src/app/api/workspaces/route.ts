import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createProject } from "@/lib/projects";

/** Buat project baru (dari sidebar). */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const result = await createProject(s.supabase, s.profile, body?.name);
  if ("error" in result) {
    return jsonError(result.error === "limit_reached" ? 403 : 400, result.error, { limit: result.limit });
  }
  return NextResponse.json(result);
}
