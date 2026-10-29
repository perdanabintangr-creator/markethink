import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { scopeMemories } from "@/lib/chat-server";

export const dynamic = "force-dynamic";

const KIT_KEYS = ["products", "target_audience", "brand_voice", "usp", "channels", "color_primary", "color_secondary", "social_handle"] as const;

/**
 * Panel konteks di chat: Brand Kit project, file project & memory yang dipakai AI di ruang chat ini.
 * `?workspace=<id>` untuk chat di dalam project; tanpa itu = chat umum (memory umum saja).
 */
export async function GET(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const raw = new URL(req.url).searchParams.get("workspace");
  const workspaceId = raw && /^[0-9a-f-]{36}$/i.test(raw) ? raw : null;

  let project: { id: string; name: string; kit: Record<string, string> } | null = null;
  let files: { name: string; mime: string }[] = [];
  let fileCount = 0;
  if (workspaceId) {
    const [{ data: ws }, { data: fileRows, count }] = await Promise.all([
      s.supabase.from("workspaces").select("id, name, brand_kit").eq("id", workspaceId).maybeSingle(),
      s.supabase
        .from("workspace_files")
        .select("name, mime", { count: "exact" })
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    if (!ws) return jsonError(404, "workspace_not_found");
    const kit = (ws.brand_kit ?? {}) as Record<string, unknown>;
    project = {
      id: ws.id as string,
      name: ws.name as string,
      kit: Object.fromEntries(
        KIT_KEYS.flatMap((k) => (typeof kit[k] === "string" && (kit[k] as string).trim() ? [[k, (kit[k] as string).trim().slice(0, 400)]] : [])),
      ),
    };
    files = (fileRows ?? []).map((f) => ({ name: f.name as string, mime: f.mime as string }));
    fileCount = count ?? files.length;
  }

  const { data: memories, count: memoryCount } = await scopeMemories(
    s.supabase.from("memories").select("content", { count: "exact" }).order("created_at", { ascending: false }).limit(6),
    workspaceId,
  );

  return NextResponse.json(
    { project, files, fileCount, memories: (memories ?? []).map((m) => m.content as string), memoryCount: memoryCount ?? 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
