import { after } from "next/server";
import {
  consumeStream,
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { z } from "zod";
import { getSession, hasAppAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardRequest } from "@/lib/ratelimit";
import { consumeCredits, refundCredits } from "@/lib/credits";
import { routeTier } from "@/lib/ai/router";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { formatSources, webSearch, type Source } from "@/lib/ai/research";
import { estimateCostUsd, getTier, messageCreditCost } from "@/lib/ai/models.config";
import {
  attachmentIds,
  extractMemories,
  generateTitle,
  loadWorkspaceContext,
  messageText,
  resolveAttachments,
  saveMessages,
} from "@/lib/chat-server";
import type { MtMessage } from "@/lib/types";
import { truncate } from "@/lib/utils";
import { env } from "@/lib/env";
import { experienceLabel, roleLabel } from "@/lib/personas";
import { getAllowedTiers } from "@/lib/plan";

export const maxDuration = 300;

const bodySchema = z.object({
  id: z.string().uuid(),
  messages: z.array(z.any()).min(1).max(200),
  tier: z.enum(["junior", "senior", "associate", "director"]).default("senior"),
  research: z.boolean().default(false),
  workspaceId: z.string().uuid().nullish(),
  agentId: z.string().uuid().nullish(),
});

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const genId = createIdGenerator({ prefix: "msg", size: 16 });

export async function POST(req: Request) {
  const { supabase, user, profile } = await getSession();
  if (!user || !profile) return json(401, { error: "unauthorized" });
  if (profile.banned) return json(403, { error: "banned" });
  if (!(await hasAppAccess(profile))) return json(403, { error: "no_access" });
  if (!(await guardRequest(user.id, req.headers))) {
    return json(429, { error: "rate_limited", message: "Terlalu banyak permintaan. Tunggu sebentar ya." });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(400, { error: "invalid_body" });
  const { id: chatId, tier: tierId, research, agentId } = parsed.data;
  const messages = parsed.data.messages as MtMessage[];
  const last = messages[messages.length - 1];
  if (last?.role !== "user") return json(400, { error: "last_message_must_be_user" });
  const lastText = messageText(last);
  if (lastText.length > 20_000) return json(413, { error: "message_too_long" });

  const allowedTiers = await getAllowedTiers(supabase, profile);
  if (!allowedTiers.includes(tierId)) {
    return json(403, { error: "tier_locked", allowed: allowedTiers });
  }

  if (!env.supabaseServiceKey) {
    console.error("[chat] SUPABASE_SERVICE_ROLE_KEY belum diisi");
    return json(503, { error: "server_not_configured" });
  }

  // --- kredit ---
  const tier = getTier(tierId);
  const attachCount = attachmentIds(last).length;
  const cost = messageCreditCost(tier, { research, attachments: attachCount });
  const credit = await consumeCredits(user.id, cost, "chat", { chatId, tier: tierId, research, attachments: attachCount });
  if (!credit.ok) {
    return json(402, { error: "quota_exceeded", remaining: credit.remaining, cost });
  }

  // --- chat: ambil atau buat ---
  const { data: existing } = await supabase
    .from("chats")
    .select("id, workspace_id, agent_id, title")
    .eq("id", chatId)
    .maybeSingle();
  let workspaceId = existing?.workspace_id ?? parsed.data.workspaceId ?? null;
  const chatAgentId = existing?.agent_id ?? agentId ?? null;
  const isNewChat = !existing;
  if (isNewChat) {
    const { error } = await supabase.from("chats").insert({
      id: chatId,
      user_id: user.id,
      workspace_id: workspaceId,
      agent_id: chatAgentId,
      tier: tierId,
      title: truncate(lastText || "Chat baru", 60),
    });
    if (error) {
      // Workspace bukan milik user / tidak valid → ulang tanpa workspace.
      workspaceId = null;
      const retry = await supabase
        .from("chats")
        .insert({ id: chatId, user_id: user.id, agent_id: chatAgentId, tier: tierId, title: truncate(lastText || "Chat baru", 60) });
      if (retry.error) {
        await refundCredits(user.id, cost, "chat_create_failed");
        return json(400, { error: "chat_create_failed" });
      }
    }
  } else {
    await supabase.from("chats").update({ tier: tierId }).eq("id", chatId);
  }

  const startedAt = Date.now();
  const admin = createAdminClient();
  let refunded = false;
  const refundOnce = async () => {
    if (refunded) return;
    refunded = true;
    await refundCredits(user.id, cost, "llm_error");
  };
  // `settled` = hasil LLM sudah tercatat (sukses / error). Kalau stream berakhir tanpa itu
  // (error sebelum LLM jalan, timeout, crash), tugas `after()` di bawah me-refund & mencatat error.
  let settled = false;
  const errors: string[] = [];
  let markDone: () => void = () => {};
  const done = new Promise<void>((resolve) => (markDone = resolve));

  const stream = createUIMessageStream<MtMessage>({
    originalMessages: messages,
    generateId: genId,
    onError: (err) => {
      console.error("[chat] error", err);
      errors.push(err instanceof Error ? err.message : String(err));
      return "Maaf, otak marketing sedang sibuk. Kreditmu sudah dikembalikan — coba lagi sebentar lagi.";
    },
    execute: async ({ writer }) => {
      // --- konteks: agent, workspace, memory, riset ---
      const [{ data: agent }, { data: memories }, wsCtx] = await Promise.all([
        chatAgentId
          ? supabase.from("agents").select("name, instructions").eq("id", chatAgentId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("memories").select("content").order("created_at", { ascending: false }).limit(30),
        loadWorkspaceContext(supabase, workspaceId, lastText),
      ]);

      let sources: Source[] = [];
      if (research && lastText.trim()) {
        writer.write({ type: "data-status", data: { state: "searching", label: "Mencari di web…" }, transient: true });
        try {
          sources = await webSearch(lastText, { signal: req.signal });
          for (const s of sources) {
            writer.write({ type: "source-url", sourceId: String(s.id), url: s.url, title: s.title });
          }
        } catch (err) {
          console.error("[research] gagal", err);
        }
        writer.write({
          type: "data-status",
          data: { state: "done", label: sources.length ? `${sources.length} sumber ditemukan` : "Riset web tidak tersedia" },
          transient: true,
        });
      }

      const system = await buildSystemPrompt(
        {
          role: [roleLabel(profile.persona_role), profile.goal && `tujuan utama: ${profile.goal}`].filter(Boolean).join(" — "),
          industry: profile.industry,
          experience: experienceLabel(profile.experience),
          language: profile.language,
          brandKit: wsCtx.brandKit,
          memories: (memories ?? []).map((m) => m.content as string),
        },
        {
          tierInstructions: tier.skillPrompt,
          agentInstructions: agent?.instructions ?? null,
          knowledge: wsCtx.knowledge,
          research: sources.length
            ? formatSources(sources)
            : research
              ? "Riset web gagal/ tidak ada hasil. Beri tahu user dan jawab dari pengetahuan umum dengan label perkiraan."
              : null,
        },
      );

      const { messages: resolved, hasImages } = await resolveAttachments(supabase, messages.slice(-40));
      const routed = routeTier(tierId, { needsVision: hasImages });

      const result = streamText({
        model: routed.model,
        system,
        messages: convertToModelMessages(resolved),
        maxOutputTokens: tier.maxOutputTokens,
        temperature: tier.temperature,
        maxRetries: 0,
        providerOptions: { anthropic: { effort: tier.effort } },
        abortSignal: req.signal,
        onFinish: async ({ usage }) => {
          settled = true;
          const used = routed.resolved() ?? routed.candidates[0];
          await admin.from("usage_logs").insert({
            user_id: user.id,
            chat_id: chatId,
            tier: tierId,
            provider: used.provider,
            model: used.modelId,
            input_tokens: usage.inputTokens ?? 0,
            output_tokens: usage.outputTokens ?? 0,
            est_cost_usd: estimateCostUsd(used, usage.inputTokens ?? 0, usage.outputTokens ?? 0),
            credits: cost,
            research,
            attachments: attachCount,
            latency_ms: Date.now() - startedAt,
          });
        },
        onError: async ({ error }) => {
          settled = true;
          console.error("[chat] stream error", error);
          await refundOnce();
          await admin.from("usage_logs").insert({
            user_id: user.id,
            chat_id: chatId,
            tier: tierId,
            credits: 0,
            research,
            status: "error",
            error: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
            latency_ms: Date.now() - startedAt,
          });
        },
      });

      writer.merge(
        result.toUIMessageStream<MtMessage>({
          sendReasoning: false,
          messageMetadata: ({ part }) => {
            if (part.type === "start") {
              return { tier: tierId, createdAt: Date.now(), credits: cost, remainingCredits: credit.remaining };
            }
            if (part.type === "finish") {
              const used = routed.resolved();
              return {
                model: used ? `${used.provider}:${used.modelId}` : undefined,
                inputTokens: part.totalUsage.inputTokens,
                outputTokens: part.totalUsage.outputTokens,
              };
            }
          },
        }),
      );
    },
    onFinish: async ({ messages: finalMessages, outcome }) => {
      markDone();
      if (outcome.status === "failed") return;
      try {
        await saveMessages(chatId, user.id, finalMessages);
      } catch (err) {
        console.error("[chat] gagal simpan pesan", err);
      }
    },
  });

  // Tugas latar: judul & memory (tidak memblokir respons).
  after(async () => {
    await Promise.race([done, new Promise((r) => setTimeout(r, 280_000))]);
    if (!settled) {
      await refundOnce();
      await admin.from("usage_logs").insert({
        user_id: user.id,
        chat_id: chatId,
        tier: tierId,
        credits: 0,
        research,
        status: "error",
        error: (errors.join(" | ") || "stream berakhir tanpa jawaban (timeout/terputus)").slice(0, 1000),
        latency_ms: Date.now() - startedAt,
      });
      return;
    }
    const userTurns = messages.filter((m) => m.role === "user");
    if (isNewChat && lastText) await generateTitle(chatId, lastText);
    if (userTurns.length % 3 === 1) {
      await extractMemories(user.id, userTurns.slice(-3).map(messageText).filter(Boolean));
    }
    await admin.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);
  });

  return createUIMessageStreamResponse({ stream, consumeSseStream: consumeStream });
}
