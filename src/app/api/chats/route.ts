import { NextResponse } from "next/server";
import { apiSession } from "@/lib/api";

export async function GET(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const q = new URL(req.url).searchParams.get("q")?.trim();
  let query = s.supabase
    .from("chats")
    .select("id, title, updated_at, workspace_id, share_token")
    .order("updated_at", { ascending: false })
    .limit(q ? 50 : 200);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query;
  return NextResponse.json({ chats: data ?? [] });
}
