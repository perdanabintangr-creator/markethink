import { NextResponse } from "next/server";
import { streamText } from "ai";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardRequest } from "@/lib/ratelimit";
import { consumeCredits, refundCredits } from "@/lib/credits";
import { routeTier } from "@/lib/ai/router";
import { untrusted } from "@/lib/ai/prompt";
import { estimateCostUsd } from "@/lib/ai/models.config";
import { toolInfo } from "@/lib/addons/catalog";
import { EXPERT } from "@/lib/addons/helpers";
import { PRO_FORMS } from "@/lib/addons/pro/forms";
import { briefFromFields } from "@/lib/addons/pro/fields";

export const maxDuration = 120;

/** Biaya kredit harian per pertanyaan (setara chat otak Senior). */
const CREDIT_COST = 2;
const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

/** Riwayat diskusi sebuah hasil Tools Pro. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!isId(id)) return jsonError(400, "invalid_id");
  const { data } = await s.supabase
    .from("tool_run_messages")
    .select("id, role, content, created_at")
    .eq("run_id", id)
    .order("created_at", { ascending: true })
    .limit(100);
  return NextResponse.json({ messages: data ?? [] });
}

const bodySchema = z.object({ message: z.string().trim().min(1).max(4000) });

/** Tanya-jawab tentang hasil: AI menjelaskan, mengakui kesalahan, dan merangkum koreksi untuk tombol "Perbaiki hasil". */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!isId(id)) return jsonError(400, "invalid_id");
  if (!(await guardRequest(s.user.id, req.headers))) return jsonError(429, "rate_limited", { message: "Terlalu cepat, tunggu sebentar." });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");

  const { data: run } = await s.supabase.from("tool_runs").select("id, tool, title, input, output, status").eq("id", id).maybeSingle();
  if (!run || run.status !== "ok") return jsonError(404, "run_not_found");
  const info = toolInfo(run.tool as string);

  const credit = await consumeCredits(s.user.id, CREDIT_COST, "tool_chat", { runId: id, tool: run.tool });
  if (!credit.ok) return jsonError(402, "quota_exceeded", { message: "Kredit harian kamu habis. Coba lagi besok atau upgrade paket." });

  const admin = createAdminClient();
  const { data: history } = await admin
    .from("tool_run_messages")
    .select("role, content")
    .eq("run_id", id)
    .order("created_at", { ascending: false })
    .limit(16);
  await admin.from("tool_run_messages").insert({ run_id: id, user_id: s.user.id, role: "user", content: parsed.data.message });

  const form = PRO_FORMS[run.tool as string];
  const input = (run.input ?? {}) as Record<string, unknown>;
  const brief = form ? briefFromFields(form.fields, input) : JSON.stringify(input).slice(0, 6000);
  const revisable = Boolean(form);

  const system = `${EXPERT}

PERAN KAMU SEKARANG
Kamu adalah pakar yang menyusun hasil "${info?.name ?? run.tool}" berjudul "${run.title ?? ""}". User sedang meninjau hasil itu dan
bertanya, meminta penjelasan, atau menemukan data/maksud yang keliru. Jawab seperti konsultan senior menjelaskan deliverable ke klien:
langsung, jujur, spesifik, merujuk bagian & angka dari hasil.

ATURAN
- Jelaskan alasan, asumsi, dan cara hitung di balik angka bila ditanya. Bila memang ada yang keliru atau tidak sesuai maksud user, akui dengan jelas
  — jangan membela hasil yang salah.
- Jawaban ringkas (umumnya 2-6 kalimat atau poin pendek), pakai Markdown sederhana. Tanpa basa-basi pembuka.
- Kamu TIDAK bisa mengubah hasil/file secara langsung dari chat ini.${
    revisable
      ? ` Bila user mengoreksi data, menyampaikan maksud/tujuan yang berbeda, atau meminta perubahan isi,
  tutup jawabanmu dengan ringkasan koreksi siap pakai di dalam blok berikut (persis formatnya, isinya perintah yang jelas & lengkap):
  [[KOREKSI]]
  - …
  [[/KOREKSI]]
  lalu sebutkan bahwa user bisa menekan tombol "Perbaiki hasil" untuk membuat versi baru (gratis, tidak memotong kuota). Gabungkan juga koreksi
  yang sudah disebut user sebelumnya di percakapan ini agar ringkasan selalu lengkap.`
      : " Bila user ingin hasil diubah, sarankan membuat hasil baru dengan isian yang dikoreksi."
  }

ISIAN USER SAAT MEMBUAT HASIL
${untrusted("isian", brief)}

HASIL YANG SEDANG DIBAHAS (JSON)
${untrusted("hasil", JSON.stringify(run.output).slice(0, 60_000))}`;

  const routed = routeTier("senior");
  const messages = [
    ...[...(history ?? [])].reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string })),
    { role: "user" as const, content: parsed.data.message },
  ];
  const started = Date.now();
  try {
    const result = streamText({
      model: routed.model,
      system,
      messages,
      maxOutputTokens: 2500,
      maxRetries: 1,
      async onFinish({ text, usage }) {
        const candidate = routed.resolved();
        const cost = candidate ? estimateCostUsd(candidate, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0, { read: usage?.cachedInputTokens ?? 0 }) : 0;
        await Promise.all([
          admin.from("tool_run_messages").insert({ run_id: id, user_id: s.user.id, role: "assistant", content: text || "(tidak ada jawaban)" }),
          admin.from("usage_logs").insert({
            user_id: s.user.id,
            tier: "tool_chat",
            provider: candidate?.provider ?? null,
            model: candidate?.modelId ?? null,
            est_cost_usd: cost,
            latency_ms: Date.now() - started,
            status: "ok",
          }),
        ]);
      },
      async onError({ error }) {
        console.error("[tool_chat] gagal", error);
        await refundCredits(s.user.id, CREDIT_COST, "tool_chat_failed");
      },
    });
    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[tool_chat] gagal", err);
    await refundCredits(s.user.id, CREDIT_COST, "tool_chat_failed");
    return jsonError(500, "chat_failed", { message: "Maaf, sedang bermasalah. Kredit kamu dikembalikan — coba lagi sebentar." });
  }
}
