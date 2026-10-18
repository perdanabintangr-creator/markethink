import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { toolInfo } from "@/lib/addons/catalog";
import { PRO_FORMS } from "@/lib/addons/pro/forms";
import { briefFromFields } from "@/lib/addons/pro/fields";
import { resultToMarkdown } from "@/lib/addons/to-markdown";

/**
 * "Bahas di Chat": buka hasil Tools Pro di chat utama. Hasil dimasukkan sebagai pesan pertama (konteks),
 * lalu user bisa bertanya/mengoreksi dengan otak, Riset Web, dan upload seperti chat biasa. Satu hasil → satu chat.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "invalid_id");

  const { data: run } = await s.supabase.from("tool_runs").select("id, tool, title, input, output, status").eq("id", id).maybeSingle();
  if (!run || run.status !== "ok") return jsonError(404, "run_not_found");

  const { data: existing } = await s.supabase.from("chats").select("id").eq("source_run_id", id).maybeSingle();
  if (existing) return NextResponse.json({ chatId: existing.id });

  const info = toolInfo(run.tool as string);
  const form = PRO_FORMS[run.tool as string];
  const input = (run.input ?? {}) as Record<string, unknown>;
  const brief = form
    ? briefFromFields(form.fields, input)
    : Object.entries(input)
        .filter(([, v]) => v !== "" && v !== null && !(Array.isArray(v) && !v.length))
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
        .join("\n");
  const resultUrl = `/tools/${run.tool}/${run.id}`;
  const text = [
    `📎 **Hasil Tools Pro: ${info?.name ?? run.tool}**`,
    `### ${run.title ?? info?.name ?? "Hasil"}`,
    brief && `**Isian awal:**\n${brief
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n")}`,
    "---",
    resultToMarkdown(run.output),
    "---",
    `Hasil di atas sudah saya pegang sebagai konteks. Silakan tanya alasannya, koreksi data yang keliru, atau jelaskan maksud & tujuanmu. Kita bahas dan kembangkan di sini.${
      form ? ` Untuk membuat ulang file PPT/Excel yang sudah dikoreksi, buka [halaman hasil](${resultUrl}) lalu klik **Perbaiki hasil**.` : ""
    }`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const admin = createAdminClient();
  const { data: chat, error } = await admin
    .from("chats")
    .insert({ user_id: s.user.id, title: `Bahas: ${run.title ?? info?.name ?? "hasil Tools Pro"}`.slice(0, 80), source_run_id: run.id })
    .select("id")
    .single();
  if (error || !chat) return jsonError(500, "chat_failed");
  const { error: msgErr } = await admin.from("messages").insert({
    id: `tool-${run.id}`,
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
  return NextResponse.json({ chatId: chat.id });
}
