import { NextResponse } from "next/server";
import { apiSession } from "@/lib/api";

export async function GET(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const q = new URL(req.url).searchParams.get("q")?.trim();
  let query = s.supabase
    .from("chats")
    .select("id, title, updated_at, workspace_id, share_token, pin_order")
    .order("updated_at", { ascending: false })
    .limit(q ? 50 : 200);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  let runsQuery = s.supabase
    .from("tool_runs")
    .select("id, tool, title, created_at, pin_order")
    .eq("status", "ok")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(q ? 50 : 100);
  if (q) runsQuery = runsQuery.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  const [{ data }, { data: toolRuns }] = await Promise.all([query, runsQuery]);
  return NextResponse.json({ chats: data ?? [], toolRuns: toolRuns ?? [] });
}
