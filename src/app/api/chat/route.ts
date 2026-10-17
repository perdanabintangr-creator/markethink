import { toolRunChatPrompt, toolRunsIndexPrompt } from "@/lib/addons/chat-context";
import { after } from "next/server";
import {
  consumeStream,
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { getSession, hasAppAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardRequest } from "@/lib/ratelimit";
import { consumeCredits, creditsForUsd, refundCredits, settleCredits } from "@/lib/credits";
import { routeTier } from "@/lib/ai/router";
import { brandVisualOf, buildSystemPrompt, buildTurnContext, formatPersonalization } from "@/lib/ai/prompt";
import { SERPER_COST_USD, fetchPageText, formatSources, searchApiEnabled, serperEnabled, webSearch, type Source } from "@/lib/ai/research";
import { clampToSchema } from "@/lib/schema-clamp";
import { presentationSchema } from "@/lib/pptx";
import { extractLinks, linkContext, linkHistoryText, readLink, toLinkPart, type LinkRead } from "@/lib/ai/links";
import { estimateCostUsd, getTier, messageCreditCost, type TierId } from "@/lib/ai/models.config";
import { autoTier, isDeckRequest, isImageRequest, resolveTier } from "@/lib/ai/auto-tier";
import {
  attachmentIds,
  extractMemories,
  generateTitle,
  historyStart,
  loadWorkspaceContext,
  messageText,
  resolveAttachments,
  saveMessages,
  scopeMemories,
  summarizeToolParts,
  withCacheBreakpoints,
} from "@/lib/chat-server";
import { carouselSchema } from "@/lib/deck/carousel";
import { deckImageMaxFor, deckStyleFor, premiumVisualsFor, capabilitiesPrompt, createChatTools } from "@/lib/ai/tools";
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
  tier: z.enum(["auto", "junior", "senior", "associate", "director"]).default("senior"),
  research: z.boolean().default(false),
  workspaceId: z.string().uuid().nullish(),
  agentId: z.string().uuid().nullish(),
});

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const genId = createIdGenerator({ prefix: "msg", size: 16 });
const PRESENTATION_JSON_SCHEMA = z.toJSONSchema(presentationSchema) as Parameters<typeof clampToSchema>[1];
/** Tool berisi data besar yang dirapikan otomatis bila melebihi batas skema (bukan gagal lalu mengulang). */
const REPAIRABLE: Record<string, { json: Parameters<typeof clampToSchema>[1]; schema: z.ZodTypeAny }> = {
  create_presentation: { json: PRESENTATION_JSON_SCHEMA, schema: presentationSchema },
  create_carousel: { json: z.toJSONSchema(carouselSchema) as Parameters<typeof clampToSchema>[1], schema: carouselSchema },
};

/** Paket Free: batas panjang jawaban (±1.500 kata) & jumlah pesan riwayat yang dibaca AI. */
const FREE_MAX_OUTPUT_TOKENS = 2_000;
const FREE_HISTORY_WINDOW = 10;
/** Ruang jawaban minimal untuk membuat PPT (semua slide dikirim dalam satu panggilan tool). */
const DECK_MAX_SEARCHES = 2;
const DECK_MIN_OUTPUT_TOKENS = 16_000;

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
  const { id: chatId, tier: tierChoice, agentId } = parsed.data;
  const messages = parsed.data.messages as MtMessage[];
  const last = messages[messages.length - 1];
  if (last?.role !== "user") return json(400, { error: "last_message_must_be_user" });
  const lastText = messageText(last);
  if (lastText.length > 20_000) return json(413, { error: "message_too_long" });

  const [allowedTiers, { data: settings }, { data: planFlags }, dailyLimits] = await Promise.all([
    getAllowedTiers(supabase, profile),
    supabase.from("app_settings").select("key, value").in("key", ["web_search", "image_gen"]),
    supabase.from("feature_flags").select("key, enabled").eq("plan_id", profile.plan_id).in("key", ["image_gen", "free_models", "research"]),
    getDailyLimits(supabase, profile),
  ]);
  const planFlag = (key: string) => planFlags?.some((f) => f.key === key && f.enabled) ?? false;
  const imageFlag = { enabled: planFlag("image_gen") };
  // Riset Web (pencarian Google: Serper/Claude/Gemini) hanya untuk paket yang membukanya — Free tidak (hemat biaya).
  const researchAllowed = profile.role === "admin" || planFlag("research");
  const research = parsed.data.research && researchAllowed;
  // Paket Free: model gratis (Gemini) dulu, Claude sebagai cadangan. Admin selalu Claude.
  // Revisi deck ("ubah namanya…", "ganti warnanya…") juga dihitung permintaan PPT bila jawaban terakhir berisi PPT.
  const prevAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const deckRequest =
    isDeckRequest(lastText) ||
    Boolean(prevAssistant?.parts.some((p) => p.type === "tool-create_presentation" || p.type === "tool-create_carousel"));
  // PPT tidak memakai Gemini gratis: model itu sering berhenti tanpa hasil saat menyusun file presentasi besar (uji 16 Okt).
  const preferFree =
    profile.role !== "admin" && planFlag("free_models") && Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY) && !deckRequest;
  // Paket Free: jawaban lebih ringkas, riwayat lebih pendek, gambar model hemat (menekan modal, kualitas tetap terjaga).
  const isFreePlan = profile.role !== "admin" && profile.plan_id === "beta";
  const setting = (key: string) => settings?.find((r) => r.key === key)?.value === true;
  const webSearchEnabled = setting("web_search");
  const imageBlockedReason = !imageGenerationEnabled()
    ? "fitur pembuat gambar belum dikonfigurasi di server"
    : !setting("image_gen")
      ? "fitur pembuat gambar belum diaktifkan admin"
      : profile.role !== "admin" && !imageFlag?.enabled
        ? "membuat gambar hanya tersedia di paket Pro & Promax"
        : null;
  // Otak Otomatis: pesan ringan → Junior, pekerjaan strategi/dokumen/riset → Senior (sesuai tier yang dibuka paket).
  let toolChat = false;
  if (tierChoice === "auto") {
    const { data: src } = await supabase.from("chats").select("source_run_id, source_agent_id").eq("id", chatId).maybeSingle();
    toolChat = Boolean(src?.source_run_id || src?.source_agent_id);
  }
  const chosenTier: TierId =
    tierChoice === "auto"
      ? resolveTier("auto", allowedTiers, () => autoTier(lastText, { attachments: attachmentIds(last).length, research, toolChat }))
      : tierChoice;
  if (!allowedTiers.includes(chosenTier)) {
    return json(403, { error: "tier_locked", allowed: allowedTiers });
  }
  // Membuat/mengedit gambar: semua paket memakai otak Junior (hasil gambar sama, modal chat jauh lebih rendah).
  const tierId: TierId = allowedTiers.includes("junior") && !toolChat && isImageRequest(lastText) ? "junior" : chosenTier;

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
    .select("id, workspace_id, agent_id, title, source_run_id")
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
      tier: tierChoice,
      title: truncate(lastText || "Chat baru", 60),
      generating_at: new Date().toISOString(),
      stop_requested_at: null,
    });
    if (error) {
      // Workspace bukan milik user / tidak valid → ulang tanpa workspace.
      workspaceId = null;
      const retry = await supabase
        .from("chats")
        .insert({
          id: chatId,
          user_id: user.id,
          agent_id: chatAgentId,
          tier: tierChoice,
          title: truncate(lastText || "Chat baru", 60),
          generating_at: new Date().toISOString(),
      stop_requested_at: null,
        });
      if (retry.error) {
        await refundCredits(user.id, cost, "chat_create_failed");
        return json(400, { error: "chat_create_failed" });
      }
    }
  } else {
    await supabase.from("chats").update({ tier: tierChoice, generating_at: new Date().toISOString(), stop_requested_at: null }).eq("id", chatId);
  }

  // Simpan pesan user sejak awal: bila user pindah chat lalu membukanya lagi, pertanyaannya terlihat & jawabannya ditunggu.
  await saveMessages(chatId, user.id, messages).catch((err) => console.error("[chat] simpan awal gagal", err));

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
  // Kredit nyata (1 kredit ≈ Rp100 modal) setelah biaya AI diketahui; potongan awal `cost` disesuaikan ke angka ini.
  let actualCredits: number | null = null;
  let remainingAfter: number | null = null;
  const errors: string[] = [];
  let markDone: () => void = () => {};
  const done = new Promise<void>((resolve) => (markDone = resolve));

  const responseId = genId();
  const stream = createUIMessageStream<MtMessage>({
    originalMessages: messages,
    generateId: genId,
    onError: (err) => {
      console.error("[chat] error", err);
      errors.push(err instanceof Error ? err.message : String(err));
      return "Maaf, otak marketing sedang sibuk. Kreditmu sudah dikembalikan — coba lagi sebentar lagi.";
    },
    execute: async ({ writer }) => {
      // Satu "start" dengan ID tetap di awal: status/sumber/tautan ditulis sebelum jawaban AI, dan kalau ID berganti
      // di tengah jalan, layar chat menampilkan jawaban dobel (mis. kotak "Sumber" dua kali).
      writer.write({
        type: "start",
        messageId: responseId,
        messageMetadata: { tier: tierId, createdAt: Date.now(), credits: cost, remainingCredits: credit.remaining },
      });
      // --- konteks: agent, workspace, memory, riset ---
      const [{ data: agent }, { data: memories }, wsCtx] = await Promise.all([
        chatAgentId
          ? supabase.from("agents").select("name, instructions").eq("id", chatAgentId).maybeSingle()
          : Promise.resolve({ data: null }),
        scopeMemories(supabase.from("memories").select("content"), workspaceId)
          .order("created_at", { ascending: false })
          .limit(30),
        loadWorkspaceContext(supabase, workspaceId, lastText),
      ]);

      // Tautan yang ditempel user: dibaca server (gratis), isinya jadi konteks jawaban & tersimpan ringkas di pesan jawaban.
      const linkUrls = extractLinks(lastText);
      let links: LinkRead[] = [];
      if (linkUrls.length) {
        const hosts = [...new Set(linkUrls.map((u) => new URL(u).hostname.replace(/^www\./, "")))].join(", ");
        writer.write({ type: "data-status", data: { state: "reading", label: `Membaca tautan: ${truncate(hosts, 60)}…` }, transient: true });
        links = await Promise.all(linkUrls.map(readLink));
        for (const l of links) writer.write({ type: "data-link", data: toLinkPart(l) });
        const okCount = links.filter((l) => l.ok).length;
        writer.write({
          type: "data-status",
          data: { state: "done", label: okCount ? `${okCount} tautan terbaca` : "Tautan tidak bisa dibaca" },
          transient: true,
        });
      }

      let sources: Source[] = [];
      // Batas pencarian harian paket (Free 5×/hari) berlaku untuk Riset Web & pencarian otomatis AI.
      const paidSearchCapped = Boolean(await dailyLimitReached(dailyLimits, user.id, "search"));
      // Riset Web: API pencarian sendiri (Serper ±$1/1.000 → Tavily) sebelum AI menjawab.
      const useTavily = research && searchApiEnabled() && !paidSearchCapped;
      let apiSearches = 0;
      if (useTavily && lastText.trim()) {
        apiSearches++;
        writer.write({ type: "data-status", data: { state: "searching", label: "Mencari di web…" }, transient: true });
        try {
          sources = await webSearch(lastText);
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

      const baseSystem = await buildSystemPrompt(
        {
          role: [roleLabel(profile.persona_role), profile.goal && `tujuan utama: ${profile.goal}`].filter(Boolean).join(" — "),
          industry: profile.industry,
          experience: experienceLabel(profile.experience),
          language: profile.language,
          brandKit: wsCtx.brandKit,
          memories: (memories ?? []).map((m) => m.content as string),
        },
        {
          tierInstructions: isFreePlan
            ? `${tier.skillPrompt}\n- Batas panjang jawaban di paket ini ±1.200 kata. Untuk permintaan besar (strategi lengkap, rencana berbulan-bulan), kerjakan inti paling penting secara utuh sampai selesai — jangan sampai terpotong — lalu tawarkan lanjut ke bagian berikutnya.`
            : tier.skillPrompt,
          capabilities: capabilitiesPrompt(imageBlockedReason, { webSearch: researchAllowed }),
          agentInstructions: agent?.instructions ?? null,
          project: wsCtx.name,
          personalization: formatPersonalization(profile.response_style, profile.custom_instructions),
        },
      );
      // Chat dari hasil Tools Pro: AI tahu versi terbaru & bisa memicu pembaruan hasil di panel kanan.
      // Chat biasa: AI tahu daftar hasil Tools Pro user & bisa membacanya (tool read_tool_result).
      const runPrompt = existing?.source_run_id
        ? await toolRunChatPrompt(admin, existing.source_run_id as string)
        : await toolRunsIndexPrompt(admin, user.id);
      const system = runPrompt ? `${baseSystem}\n\n${runPrompt}` : baseSystem;
      // Konteks yang berubah tiap pesan ditaruh di pesan user terakhir agar system prompt tetap bisa di-cache.
      const turnContext = buildTurnContext({
        knowledge: wsCtx.knowledge,
        links: links.length ? linkContext(links) : null,
        research: sources.length
            ? formatSources(sources)
            : useTavily
              ? "Riset web gagal/ tidak ada hasil. Beri tahu user dan jawab dari pengetahuan umum dengan label perkiraan."
              : research
                ? "User mengaktifkan Riset Web: wajib gunakan alat pencarian web (bila tersedia) sebelum menjawab, dan sertakan sumbernya."
                : null,
      });

      const { messages: resolvedRaw, hasImages } = await resolveAttachments(
        supabase,
        // Hasil Tools Pro ("Bahas di Chat") di pesan pertama selalu ikut sebagai konteks walau chat sudah panjang.
        historyStart(messages.length, isFreePlan ? FREE_HISTORY_WINDOW : undefined) > 0 && /^(tool|agent)-/.test(messages[0]?.id ?? "")
          ? [messages[0], ...messages.slice(historyStart(messages.length, isFreePlan ? FREE_HISTORY_WINDOW : undefined))]
          : messages.slice(historyStart(messages.length, isFreePlan ? FREE_HISTORY_WINDOW : undefined)),
      );
      // Jejak tool tidak dikirim ulang apa adanya — hasil gambar/PPT diringkas jadi teks.
      const resolved = resolvedRaw.map(summarizeToolParts);
      if (turnContext) {
        const lastMsg = resolved[resolved.length - 1];
        resolved[resolved.length - 1] = { ...lastMsg, parts: [{ type: "text", text: turnContext }, ...lastMsg.parts] };
      }
      // Serper terpasang → AI mencari lewat Serper (10× lebih murah dari pencarian bawaan Claude, bisa dipakai semua model).
      const serperOn = researchAllowed && webSearchEnabled && tier.webSearches > 0 && serperEnabled() && !paidSearchCapped;
      const webSearchOn =
        !serperOn && researchAllowed && webSearchEnabled && tier.webSearches > 0 && Boolean(process.env.ANTHROPIC_API_KEY) && !paidSearchCapped;
      // PPT: maks 2 pencarian (founder ACC 17 Okt) — tiap hasil riset ikut dibaca ulang AI, 4× riset menambah ±Rp1.500–2.000/deck.
      const maxSearches = Math.min(research ? tier.webSearches + 2 : tier.webSearches, deckRequest ? DECK_MAX_SEARCHES : Infinity);
      let nextSourceId = sources.length;
      // Google Search bawaan Gemini hanya bila Serper tidak ada (Gemini tidak bisa mencampur alat bawaan & alat kita; kuota gratisnya juga cepat habis).
      const googleSearchOn = !serperOn && researchAllowed && webSearchEnabled && preferFree && !paidSearchCapped;
      const routed = routeTier(tierId, { needsVision: hasImages, preferFree, deck: deckRequest });

      // Tombol Stop: /api/chat/stop mengisi chats.stop_requested_at → AI di server dihentikan (dicek tiap 1,5 detik).
      const stopCtrl = new AbortController();
      const stopWatch = setInterval(async () => {
        if (Date.now() - startedAt > 300_000) return clearInterval(stopWatch);
        const { data } = await admin.from("chats").select("stop_requested_at").eq("id", chatId).maybeSingle();
        if (data?.stop_requested_at) stopCtrl.abort();
      }, 1500);
      const endStopWatch = () => clearInterval(stopWatch);

      const result = streamText({
        abortSignal: stopCtrl.signal,
        model: routed.model,
        // Prompt caching Claude: system prompt (stabil) + riwayat chat dibaca dari cache dengan ± 10% harga input.
        messages: [
          { role: "system", content: system, providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
          ...withCacheBreakpoints(
            convertToModelMessages(resolved, {
              // Tautan yang sudah dibaca di jawaban sebelumnya ikut di riwayat (versi ringkas).
              convertDataPart: (part) => (part.type === "data-link" ? { type: "text", text: linkHistoryText(part.data as Parameters<typeof linkHistoryText>[0]) } : undefined),
            }),
          ),
        ],
        // Batas Free hanya untuk jawaban teks; menyusun file PPT butuh ruang lebih (isi semua slide dalam satu panggilan tool).
        // PPT: minimal 16 rb token (proses berpikir + isi semua slide) — 8 rb pernah habis sebelum file jadi (finish=length).
        maxOutputTokens: deckRequest
          ? Math.max(tier.maxOutputTokens, DECK_MIN_OUTPUT_TOKENS)
          : isFreePlan
            ? Math.min(tier.maxOutputTokens, FREE_MAX_OUTPUT_TOKENS)
            : tier.maxOutputTokens,
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
            // Foto AI di PPT hanya untuk paket tanpa batas harian gambar (Pro/Promax/admin).
            // Visual bertingkat: foto AI di PPT Free 0, Starter 1 (cover), Pro 6, Promax 8; Pro & Promax arahan visual premium.
            deckImageMax: imageBlockedReason ? 0 : deckImageMaxFor(profile.plan_id, profile.role === "admin"),
            premiumVisuals: premiumVisualsFor(profile.plan_id, profile.role === "admin"),
            deckStyle: deckStyleFor(profile.plan_id, profile.role === "admin"),
            // Semua paket: gambar baru memakai Muse (±$0,01). Edit dari foto/gambar acuan tetap Gemini.
            budgetImages: true,
            brand: brandVisualOf(wsCtx.brandKit),
          }),
          ...(serperOn
            ? {
                web_search: tool({
                  description:
                    "Cari informasi terkini di Google (hasil untuk Indonesia): harga, tren, data pasar, berita, kompetitor. " +
                    "Pakai kata kunci spesifik; boleh beberapa kali dengan kata kunci berbeda. Kutip sumber dengan nomor [n] sesuai hasil.",
                  inputSchema: z.object({ query: z.string().min(2).max(300).describe("Kata kunci pencarian") }),
                  execute: async ({ query }) => {
                    if (apiSearches >= maxSearches + (useTavily ? 1 : 0)) return { error: "Batas pencarian untuk pesan ini tercapai. Jawab dari hasil yang ada." };
                    apiSearches++;
                    writer.write({ type: "data-status", data: { state: "searching", label: `Mencari di web: ${truncate(query, 60)}` }, transient: true });
                    try {
                      const found = await webSearch(query, { maxResults: 6 });
                      // Baca isi 3 halaman teratas (gratis) agar jawaban tidak hanya dari cuplikan Google.
                      const readable = found.filter((f) => !/instagram|tiktok|facebook|youtube|lemon8|shopee|tokopedia/i.test(f.url)).slice(0, 3);
                      const pages = await Promise.allSettled(readable.map((f) => fetchPageText(f.url, { maxChars: 2500, timeoutMs: 6000 })));
                      readable.forEach((f, i) => {
                        const r = pages[i];
                        if (r.status === "fulfilled" && r.value) f.content = `${f.content}\n\nIsi halaman (cuplikan):\n${r.value}`;
                      });
                      const numbered = found.map((s) => ({ ...s, id: ++nextSourceId }));
                      for (const s of numbered) writer.write({ type: "source-url", sourceId: String(s.id), url: s.url, title: s.title });
                      writer.write({ type: "data-status", data: { state: "done", label: `${numbered.length} sumber ditemukan` }, transient: true });
                      return { results: formatSources(numbered) };
                    } catch (err) {
                      console.error("[serper] gagal", err);
                      writer.write({ type: "data-status", data: { state: "done", label: "Riset web tidak tersedia" }, transient: true });
                      return { error: "Pencarian web sedang tidak tersedia. Jawab dari pengetahuan umum dan beri label perkiraan." };
                    }
                  },
                }),
              }
            : webSearchOn
            ? {
                web_search: anthropic.tools.webSearch_20250305({
                  maxUses: maxSearches,
                  userLocation: { type: "approximate", country: "ID", timezone: "Asia/Jakarta" },
                }),
              }
            : {}),
          ...(googleSearchOn ? { google_search: google.tools.googleSearch({}) } : {}),
        },
        // Isi PPT melebihi batas skema (sering pada otak Director yang sangat detail) → dirapikan, bukan gagal lalu mengulang.
        experimental_repairToolCall: async ({ toolCall }) => {
          const repair = REPAIRABLE[toolCall.toolName];
          if (!repair) return null;
          try {
            const fixed = clampToSchema(JSON.parse(toolCall.input), repair.json);
            if (!fixed || !repair.schema.safeParse(fixed).success) return null;
            return { ...toolCall, input: JSON.stringify(fixed) };
          } catch {
            return null;
          }
        },
        // Beberapa langkah: model memanggil tool (gambar/PPT) lalu menjelaskan hasilnya.
        stopWhen: stepCountIs(5),
        // Tanpa abortSignal: jawaban tetap diselesaikan & disimpan walau user pindah chat / menutup tab (seperti ChatGPT).
        onAbort: async ({ steps }) => {
          // Dihentikan user: kuota disesuaikan ke pemakaian sejauh ini.
          endStopWatch();
          settled = true;
          const used = routed.resolved() ?? routed.candidates[0];
          const inTok = steps.reduce((a, s) => a + (s.usage.inputTokens ?? 0), 0);
          const outTok = steps.reduce((a, s) => a + (s.usage.outputTokens ?? 0), 0);
          const costUsd = freeTierModel(used) ? 0 : estimateCostUsd(used, inTok, outTok);
          actualCredits = inTok || outTok ? creditsForUsd(costUsd) : 0;
          remainingAfter = await settleCredits(user.id, cost, actualCredits, "chat_stopped", { chatId, tier: tierId });
          await admin.from("usage_logs").insert({
            user_id: user.id,
            chat_id: chatId,
            tier: tierId,
            provider: used.provider,
            model: used.modelId,
            input_tokens: inTok,
            output_tokens: outTok,
            est_cost_usd: costUsd,
            credits: actualCredits,
            research,
            status: "ok",
            error: "dihentikan user (Stop)",
            latency_ms: Date.now() - startedAt,
          });
        },
        onFinish: async ({ totalUsage: usage, steps, text }) => {
          endStopWatch();
          settled = true;
          // Jawaban kosong (tanpa teks & tanpa hasil tool yang berhasil) → kuota dikembalikan penuh.
          const produced =
            text.trim().length > 0 ||
            steps.some((s) => s.text.trim().length > 0 || s.toolResults.some((r) => (r?.output as { ok?: boolean } | undefined)?.ok));
          const used = routed.resolved() ?? routed.candidates[0];
          const claudeSearches = steps.reduce((sum, step) => {
            const raw = step.providerMetadata?.anthropic?.usage as { server_tool_use?: { web_search_requests?: number } } | undefined;
            return sum + (raw?.server_tool_use?.web_search_requests ?? 0);
          }, 0);
          const searches = claudeSearches + apiSearches;
          const cacheWrite = steps.reduce(
            (sum, step) => sum + Number(step.providerMetadata?.anthropic?.cacheCreationInputTokens ?? 0),
            0,
          );
          const cacheRead = usage.cachedInputTokens ?? 0;
          const costUsd =
            (freeTierModel(used)
              ? 0
              : estimateCostUsd(used, usage.inputTokens ?? 0, usage.outputTokens ?? 0, { read: cacheRead, write: cacheWrite })) +
            claudeSearches * 0.01 +
            (serperEnabled() ? apiSearches * SERPER_COST_USD : 0);
          actualCredits = produced ? creditsForUsd(costUsd) : 0;
          remainingAfter = await settleCredits(user.id, cost, actualCredits, "chat_settle", { chatId, tier: tierId });
          await admin.from("usage_logs").insert({
            user_id: user.id,
            chat_id: chatId,
            tier: tierId,
            provider: used.provider,
            model: used.modelId,
            input_tokens: usage.inputTokens ?? 0,
            output_tokens: usage.outputTokens ?? 0,
            est_cost_usd: costUsd,
            cache_read_tokens: cacheRead,
            cache_write_tokens: cacheWrite,
            web_searches: searches,
            status: produced ? "ok" : "error",
            error: !produced
              ? `jawaban kosong (model berhenti tanpa hasil): finish=${steps.at(-1)?.finishReason ?? "?"}`
              : routed.toolFallback()
                ? `web search dilewati: ${routed.toolFallback()}`
                : null,
            credits: actualCredits,
            research,
            attachments: attachCount,
            latency_ms: Date.now() - startedAt,
          });
        },
        onError: async ({ error }) => {
          endStopWatch();
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
          sendStart: false,
          messageMetadata: ({ part }) => {
            if (part.type === "finish") {
              const used = routed.resolved();
              return {
                model: used ? `${used.provider}:${used.modelId}` : undefined,
                inputTokens: part.totalUsage.inputTokens,
                outputTokens: part.totalUsage.outputTokens,
                ...(actualCredits !== null ? { credits: actualCredits } : {}),
                ...(remainingAfter !== null ? { remainingCredits: remainingAfter } : {}),
              };
            }
          },
        }),
      );
    },
    onFinish: async ({ messages: finalMessages, outcome }) => {
      markDone();
      const clearGenerating = () => admin.from("chats").update({ generating_at: null }).eq("id", chatId);
      if (outcome.status === "failed") {
        await clearGenerating();
        return;
      }
      try {
        // Label kredit di pesan tersimpan = kredit nyata setelah disesuaikan.
        const lastMsg = finalMessages[finalMessages.length - 1];
        if (lastMsg?.role === "assistant" && actualCredits !== null) {
          lastMsg.metadata = { ...(lastMsg.metadata ?? {}), credits: actualCredits, ...(remainingAfter !== null ? { remainingCredits: remainingAfter } : {}) };
        }
        await saveMessages(chatId, user.id, finalMessages);
      } catch (err) {
        console.error("[chat] gagal simpan pesan", err);
      }
      await clearGenerating();
    },
  });

  // Tugas latar: judul & memory (tidak memblokir respons).
  after(async () => {
    await Promise.race([done, new Promise((r) => setTimeout(r, 280_000))]);
    await admin.from("chats").update({ generating_at: null }).eq("id", chatId);
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
      await extractMemories(user.id, userTurns.slice(-3).map(messageText).filter(Boolean), workspaceId);
    }
    await admin.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);
  });

  return createUIMessageStreamResponse({ stream, consumeSseStream: consumeStream });
}
