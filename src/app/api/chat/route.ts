import { after } from "next/server";
import {
  consumeStream,
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from "ai";
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { getSession, hasAppAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardRequest } from "@/lib/ratelimit";
import { consumeCredits, refundCredits } from "@/lib/credits";
import { routeTier } from "@/lib/ai/router";
import { buildSystemPrompt, buildTurnContext } from "@/lib/ai/prompt";
import { formatSources, webSearch, type Source } from "@/lib/ai/research";
import { estimateCostUsd, getTier, messageCreditCost } from "@/lib/ai/models.config";
import {
  attachmentIds,
  extractMemories,
  generateTitle,
  historyStart,
  loadWorkspaceContext,
  messageText,
  resolveAttachments,
  saveMessages,
  summarizeToolParts,
} from "@/lib/chat-server";
import { capabilitiesPrompt, createChatTools } from "@/lib/ai/tools";
import { imageGenerationEnabled } from "@/lib/ai/image";
import type { MtMessage } from "@/lib/types";
import { truncate } from "@/lib/utils";
import { env } from "@/lib/env";
import { experienceLabel, roleLabel } from "@/lib/personas";
import { getAllowedTiers } from "@/lib/plan";
import { dailyLimitReached, getDailyLimits } from "@/lib/limits";

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

/** Gemini memakai free tier (tanpa billing) kecuali env GOOGLE_BILLING_ENABLED diisi → biaya Rp0. */
const freeTierModel = (c: { provider: string }) => c.provider === "google" && !process.env.GOOGLE_BILLING_ENABLED;

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

  const [allowedTiers, { data: settings }, { data: planFlags }, dailyLimits] = await Promise.all([
    getAllowedTiers(supabase, profile),
    supabase.from("app_settings").select("key, value").in("key", ["web_search", "image_gen"]),
    supabase.from("feature_flags").select("key, enabled").eq("plan_id", profile.plan_id).in("key", ["image_gen", "free_models"]),
    getDailyLimits(supabase, profile),
  ]);
  const planFlag = (key: string) => planFlags?.some((f) => f.key === key && f.enabled) ?? false;
  const imageFlag = { enabled: planFlag("image_gen") };
  // Paket Free: model gratis (Gemini) dulu, Claude sebagai cadangan. Admin selalu Claude.
  const preferFree = profile.role !== "admin" && planFlag("free_models") && Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const setting = (key: string) => settings?.find((r) => r.key === key)?.value === true;
  const webSearchEnabled = setting("web_search");
  const imageBlockedReason = !imageGenerationEnabled()
    ? "fitur pembuat gambar belum dikonfigurasi di server"
    : !setting("image_gen")
      ? "fitur pembuat gambar belum diaktifkan admin"
      : profile.role !== "admin" && !imageFlag?.enabled
        ? "membuat gambar hanya tersedia di paket Pro & Promax"
        : null;
  if (!allowedTiers.includes(tierId)) {
    return json(403, { error: "tier_locked", allowed: allowedTiers });
  }

  if (!env.supabaseServiceKey) {
    console.error("[chat] SUPABASE_SERVICE_ROLE_KEY belum diisi");
    return json(503, { error: "server_not_configured" });
  }

  // --- batas harian paket (mis. Free 20 chat/hari) ---
  const chatLimit = await dailyLimitReached(dailyLimits, user.id, "chat");
  if (chatLimit) return json(429, { error: "daily_limit", kind: "chat", message: chatLimit });

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
      const useTavily = research && Boolean(process.env.TAVILY_API_KEY);
      if (useTavily && lastText.trim()) {
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
          capabilities: capabilitiesPrompt(imageBlockedReason),
          agentInstructions: agent?.instructions ?? null,
        },
      );
      // Konteks yang berubah tiap pesan ditaruh di pesan user terakhir agar system prompt tetap bisa di-cache.
      const turnContext = buildTurnContext({
        knowledge: wsCtx.knowledge,
        research: sources.length
            ? formatSources(sources)
            : useTavily
              ? "Riset web gagal/ tidak ada hasil. Beri tahu user dan jawab dari pengetahuan umum dengan label perkiraan."
              : research
                ? "User mengaktifkan Riset Web: wajib gunakan alat pencarian web (bila tersedia) sebelum menjawab, dan sertakan sumbernya."
                : null,
      });

      const { messages: resolvedRaw, hasImages } = await resolveAttachments(supabase, messages.slice(historyStart(messages.length)));
      // Jejak tool tidak dikirim ulang apa adanya — hasil gambar/PPT diringkas jadi teks.
      const resolved = resolvedRaw.map(summarizeToolParts);
      if (turnContext) {
        const lastMsg = resolved[resolved.length - 1];
        resolved[resolved.length - 1] = { ...lastMsg, parts: [{ type: "text", text: turnContext }, ...lastMsg.parts] };
      }
      // Pencarian web Claude (berbayar) — paket Free dibatasi per hari; Google Search (gratis) untuk Gemini.
      const paidSearchCapped = Boolean(await dailyLimitReached(dailyLimits, user.id, "search"));
      const webSearchOn =
        webSearchEnabled && tier.webSearches > 0 && Boolean(process.env.ANTHROPIC_API_KEY) && !paidSearchCapped;
      const googleSearchOn = webSearchEnabled && preferFree;
      const routed = routeTier(tierId, { needsVision: hasImages, preferFree });

      const result = streamText({
        model: routed.model,
        // Prompt caching Claude: system prompt (stabil) + riwayat chat dibaca dari cache dengan ± 10% harga input.
        messages: [
          { role: "system", content: system, providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
          ...convertToModelMessages(resolved),
        ],
        maxOutputTokens: tier.maxOutputTokens,
        temperature: tier.temperature,
        maxRetries: 0,
        providerOptions: { anthropic: { effort: tier.effort, cacheControl: { type: "ephemeral" } } },
        tools: {
          ...createChatTools({
            admin,
            userId: user.id,
            chatId,
            imageBlockedReason,
            dailyLimit: (kind) => dailyLimitReached(dailyLimits, user.id, kind),
          }),
          ...(webSearchOn
            ? {
                web_search: anthropic.tools.webSearch_20250305({
                  maxUses: research ? tier.webSearches + 2 : tier.webSearches,
                  userLocation: { type: "approximate", country: "ID", timezone: "Asia/Jakarta" },
                }),
              }
            : {}),
          ...(googleSearchOn ? { google_search: google.tools.googleSearch({}) } : {}),
        },
        // Beberapa langkah: model memanggil tool (gambar/PPT) lalu menjelaskan hasilnya.
        stopWhen: stepCountIs(5),
        abortSignal: req.signal,
        onFinish: async ({ totalUsage: usage, steps }) => {
          settled = true;
          const used = routed.resolved() ?? routed.candidates[0];
          const searches = steps.reduce((sum, step) => {
            const raw = step.providerMetadata?.anthropic?.usage as { server_tool_use?: { web_search_requests?: number } } | undefined;
            return sum + (raw?.server_tool_use?.web_search_requests ?? 0);
          }, 0);
          const cacheWrite = steps.reduce(
            (sum, step) => sum + Number(step.providerMetadata?.anthropic?.cacheCreationInputTokens ?? 0),
            0,
          );
          const cacheRead = usage.cachedInputTokens ?? 0;
          await admin.from("usage_logs").insert({
            user_id: user.id,
            chat_id: chatId,
            tier: tierId,
            provider: used.provider,
            model: used.modelId,
            input_tokens: usage.inputTokens ?? 0,
            output_tokens: usage.outputTokens ?? 0,
            est_cost_usd:
              (freeTierModel(used)
                ? 0
                : estimateCostUsd(used, usage.inputTokens ?? 0, usage.outputTokens ?? 0, { read: cacheRead, write: cacheWrite })) +
              searches * 0.01,
            cache_read_tokens: cacheRead,
            cache_write_tokens: cacheWrite,
            web_searches: searches,
            error: routed.toolFallback() ? `web search dilewati: ${routed.toolFallback()}` : null,
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
          sendSources: true,
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
