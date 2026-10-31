import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { toolInfo } from "@/lib/addons/catalog";
import { loadAgentRun } from "@/lib/agent/server";

/** "Bahas paket di Chat": ringkasan misi + daftar hasil jadi pesan pertama; AI bisa membaca tiap hasil lewat read_tool_result. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const admin = createAdminClient();
  const run = await loadAgentRun(admin, id, s.user.id);
  if (!run || !run.summary) return jsonError(404, "not_found");
  if (run.chat_id) {
    const { data: chat } = await admin.from("chats").select("id").eq("id", run.chat_id).maybeSingle();
    if (chat) return NextResponse.json({ chatId: chat.id });
  }

  const ids = run.plan.filter((p) => p.status === "ok" && p.run_id).map((p) => p.run_id!) as string[];
  const { data: runs } = await admin.from("tool_runs").select("id, tool, title").in("id", ids);
  const list = ids
    .map((rid) => (runs ?? []).find((r) => r.id === rid))
    .filter(Boolean)
    .map((r) => `- [${r!.title ?? toolInfo(r!.tool as string)?.name}](/tools/${r!.tool}/${r!.id}) · ${toolInfo(r!.tool as string)?.name} (id=${r!.id})`)
    .join("\n");
  const text = [
    `🤖 **Paket Marqthink Agent: ${run.title ?? "Misi"}**`,
    `**Tujuan:**\n> ${run.goal.replace(/\n/g, "\n> ")}`,
    "---",
    run.summary,
    "---",
    `**Hasil lengkap tiap langkah:**\n${list}`,
    "Paket ini sudah saya pegang sebagai konteks. Tanyakan apa saja, minta detail salah satu hasil, atau minta saya mengembangkan langkah eksekusinya.",
  ].join("\n\n");

  const { data: chat, error } = await admin
    .from("chats")
    .insert({ user_id: s.user.id, title: `Paket: ${run.title ?? "Marqthink Agent"}`.slice(0, 80), source_agent_id: run.id })
    .select("id")
    .single();
  if (error || !chat) return jsonError(500, "chat_failed");
  const { error: msgErr } = await admin.from("messages").insert({
    id: `agent-${run.id}`,
    chat_id: chat.id,
    user_id: s.user.id,
    role: "assistant",
    parts: [{ type: "text", text }],
    metadata: null,
    position: 0,
  });
  if (msgErr) {
    await admin.from("chats").delete().eq("id", chat.id);
    return jsonError(500, "chat_failed");
  }
  await admin.from("agent_runs").update({ chat_id: chat.id }).eq("id", run.id);
  return NextResponse.json({ chatId: chat.id });
}
