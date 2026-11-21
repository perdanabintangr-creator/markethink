import "server-only";
import { generateText } from "ai";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractJson } from "@/lib/addons/json-output";
import { estimateCostUsd } from "@/lib/ai/models.config";
import { routeTier } from "@/lib/ai/router";
import { untrusted } from "@/lib/ai/prompt";
import { researchBrand } from "@/lib/autopilot/brand-research";
import { researchSchema, type BrandResearch } from "@/lib/autopilot/research-shape";
import { autopilotGate, completeness, nextVersion, type AssetKind, type GateReason } from "./onboarding";
import {
  brandDnaSchema,
  cdPrompt,
  copywriterSchema,
  designerSchema,
  mergeDna,
  dnaContext,
  profileBlock,
  pillarMixFromDna,
  rolePrompt,
  socmedSchema,
  styleDnaFrom,
  type BrandDna,
} from "./dna";

/**
 * Brand Onboarding & Brand DNA (server): status onboarding, aset, riset + tim AI 4 peran → DNA bervesi, ACC, dan
 * pemakaian di Autopilot.
 */

export async function loadOnboarding(admin: SupabaseClient, userId: string, workspaceId: string) {
  const [{ data: ws }, { data: assets }, { data: versions }] = await Promise.all([
    admin.from("workspaces").select("id, name, brand_kit, onboarding_status, brand_dna_version").eq("id", workspaceId).eq("user_id", userId).maybeSingle(),
    admin.from("brand_assets").select("id, kind, storage_path, caption, created_at").eq("workspace_id", workspaceId).eq("user_id", userId).order("created_at"),
    admin
      .from("brand_dna_versions")
      .select("id, version, status, dna, kit_snapshot, cost_usd, edited_by_user, approved_at, created_at")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .order("version", { ascending: false })
      .limit(10),
  ]);
  if (!ws) return null;
  const kit = (ws.brand_kit ?? {}) as Record<string, unknown>;
  const list = (assets ?? []) as {
    id: string;
    kind: AssetKind;
    storage_path: string;
    caption: string | null;
    created_at: string;
  }[];
  const c = completeness({ name: String(ws.name), kit, assets: list });
  return {
    ws,
    kit,
    assets: list,
    versions: versions ?? [],
    completeness: c,
    approvedVersion: (ws.brand_dna_version as number | null) ?? null,
  };
}

/** Gate Autopilot untuk project ini. */
export async function brandGate(admin: SupabaseClient, userId: string, workspaceId: string | null): Promise<GateReason> {
  if (!workspaceId) return "no_brand";
  const o = await loadOnboarding(admin, userId, workspaceId);
  if (!o) return "no_brand";
  return autopilotGate({
    workspaceId,
    requiredDone: o.completeness.requiredDone,
    approvedVersion: o.approvedVersion,
  });
}

/** Brand DNA versi aktif (sudah di-ACC) untuk project ini. */
export async function approvedDna(admin: SupabaseClient, userId: string, workspaceId: string | null): Promise<{ version: number; dna: BrandDna } | null> {
  if (!workspaceId) return null;
  const { data: ws } = await admin.from("workspaces").select("brand_dna_version").eq("id", workspaceId).eq("user_id", userId).maybeSingle();
  const v = ws?.brand_dna_version as number | null | undefined;
  if (!v) return null;
  const { data } = await admin.from("brand_dna_versions").select("dna").eq("workspace_id", workspaceId).eq("version", v).maybeSingle();
  const parsed = brandDnaSchema.safeParse(data?.dna);
  return parsed.success ? { version: v, dna: parsed.data } : null;
}

async function assetImages(admin: SupabaseClient, userId: string, assets: { kind: AssetKind; storage_path: string }[]) {
  const order: AssetKind[] = ["logo", "real_photo", "feed_screenshot", "competitor_screenshot", "reference_screenshot"];
  const sorted = [...assets].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)).slice(0, 12);
  const out: { kind: AssetKind; buf: Buffer }[] = [];
  for (const a of sorted) {
    if (!a.storage_path.startsWith(`${userId}/`) || a.storage_path.includes("..")) continue;
    const { data } = await admin.storage.from("uploads").download(a.storage_path);
    if (!data) continue;
    const buf = await sharp(Buffer.from(await data.arrayBuffer()))
      .rotate()
      .resize({
        width: 900,
        height: 900,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82 })
      .toBuffer();
    out.push({ kind: a.kind, buf });
  }
  return out;
}

async function callJson(admin: SupabaseClient, userId: string, workspaceId: string, stage: string, prompt: string, maxTokens: number, timeoutMs = 100_000) {
  const routed = routeTier("senior");
  const started = Date.now();
  try {
    const out = await generateText({
      model: routed.model,
      maxOutputTokens: maxTokens,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(timeoutMs),
      providerOptions: { anthropic: { effort: "low" } },
      prompt,
    });
    const c = routed.resolved() ?? routed.candidates[0];
    const cost = estimateCostUsd(c, out.usage.inputTokens ?? 0, out.usage.outputTokens ?? 0);
    await admin.from("usage_logs").insert({
      user_id: userId,
      tier: `brand-${stage}`,
      provider: c.provider,
      model: c.modelId,
      latency_ms: Date.now() - started,
      input_tokens: out.usage.inputTokens ?? 0,
      output_tokens: out.usage.outputTokens ?? 0,
      est_cost_usd: cost,
      credits: 0,
      status: "ok",
      meta: { workspace_id: workspaceId, stage },
    });
    return {
      json: extractJson(out.text) as Record<string, unknown> | null,
      cost,
    };
  } catch (err) {
    await admin.from("usage_logs").insert({
      user_id: userId,
      tier: `brand-${stage}`,
      latency_ms: Date.now() - started,
      credits: 0,
      status: "error",
      error: `${stage}: ${String(err).slice(0, 400)}`,
      meta: { workspace_id: workspaceId, stage },
    });
    return { json: null, cost: 0 };
  }
}

/**
 * Riset + tim AI → Brand DNA versi baru (draft). Riset gagal → tetap lanjut dari profil & aset (fallback).
 * Mengembalikan { version } atau melempar Error("dna_failed").
 */
export async function generateBrandDna(admin: SupabaseClient, o: { userId: string; workspaceId: string; en: boolean }) {
  const ob = await loadOnboarding(admin, o.userId, o.workspaceId);
  if (!ob) throw new Error("workspace_not_found");
  if (!ob.completeness.requiredDone) throw new Error("onboarding_incomplete");
  await admin.from("workspaces").update({ onboarding_status: "researching" }).eq("id", o.workspaceId).eq("user_id", o.userId);
  try {
    // 1) Riset (web + gambar + aset klien). Gagal → fallback tanpa riset.
    const images = await assetImages(admin, o.userId, ob.assets);
    let research: BrandResearch | null = null;
    let researchId: string | null = null;
    let researchCost = 0;
    try {
      const saved = await researchBrand(admin, {
        userId: o.userId,
        workspaceId: o.workspaceId,
        en: o.en,
        assets: images,
        applyStyle: false,
      });
      const parsed = researchSchema.safeParse(saved?.data);
      if (parsed.success) research = parsed.data;
      researchId = (saved?.id as string) ?? null;
      const { data: cost } = await admin
        .from("usage_logs")
        .select("est_cost_usd")
        .eq("user_id", o.userId)
        .eq("tier", "autopilot-research")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      researchCost = Number(cost?.est_cost_usd ?? 0);
    } catch (err) {
      console.warn("[brand-dna] riset gagal, lanjut tanpa riset", String(err).slice(0, 200));
    }
    const { data: wsNow } = await admin.from("workspaces").select("name, brand_kit").eq("id", o.workspaceId).single();
    const kit = (wsNow?.brand_kit ?? ob.kit) as Record<string, unknown>;
    const ctx = dnaContext(untrusted("profil_brand", profileBlock(String(wsNow?.name ?? ob.ws.name), kit)), research);

    // 2) Tiga peran paralel → 3) Creative Director menyatukan & memutuskan.
    const [designer, copywriter, socmed] = await Promise.all([
      callJson(admin, o.userId, o.workspaceId, "designer", rolePrompt("designer", ctx, o.en), 3500),
      callJson(admin, o.userId, o.workspaceId, "copywriter", rolePrompt("copywriter", ctx, o.en), 3000),
      callJson(admin, o.userId, o.workspaceId, "socmed", rolePrompt("socmed", ctx, o.en), 2500),
    ]);
    const drafts = {
      designer: designerSchema.safeParse(designer.json).success ? designerSchema.parse(designer.json) : designer.json,
      copywriter: copywriterSchema.safeParse(copywriter.json).success ? copywriterSchema.parse(copywriter.json) : copywriter.json,
      socmed: socmedSchema.safeParse(socmed.json).success ? socmedSchema.parse(socmed.json) : socmed.json,
    };
    const cd = await callJson(admin, o.userId, o.workspaceId, "creative-director", cdPrompt(ctx, drafts as never, o.en), 6000, 110_000);
    const dna = mergeDna(drafts, (cd.json ?? {}) as never);
    if (!dna) throw new Error("dna_failed");

    const { data: existing } = await admin.from("brand_dna_versions").select("version").eq("workspace_id", o.workspaceId);
    const version = nextVersion((existing ?? []).map((r) => Number(r.version)));
    const cost = researchCost + designer.cost + copywriter.cost + socmed.cost + cd.cost;
    const { error } = await admin.from("brand_dna_versions").insert({
      user_id: o.userId,
      workspace_id: o.workspaceId,
      version,
      status: "draft",
      dna,
      research_id: researchId,
      kit_snapshot: { ...kit, _assets: ob.assets.length },
      cost_usd: Math.round(cost * 10000) / 10000,
    });
    if (error) throw error;
    await admin.from("workspaces").update({ onboarding_status: "review" }).eq("id", o.workspaceId).eq("user_id", o.userId);
    return { version, cost, researched: Boolean(research) };
  } catch (err) {
    await admin
      .from("workspaces")
      .update({ onboarding_status: ob.approvedVersion ? "approved" : "draft" })
      .eq("id", o.workspaceId)
      .eq("user_id", o.userId);
    throw err;
  }
}

/** Simpan edit klien. Versi yang sudah di-ACC tidak diubah: editannya menjadi versi baru (draft). */
export async function saveDnaEdit(admin: SupabaseClient, o: { userId: string; workspaceId: string; version: number; dna: unknown }) {
  const parsed = brandDnaSchema.safeParse(o.dna);
  if (!parsed.success) return { error: "invalid_dna" as const };
  const { data: row } = await admin
    .from("brand_dna_versions")
    .select("status, research_id, kit_snapshot")
    .eq("workspace_id", o.workspaceId)
    .eq("user_id", o.userId)
    .eq("version", o.version)
    .maybeSingle();
  if (!row) return { error: "not_found" as const };
  if (row.status === "draft") {
    await admin.from("brand_dna_versions").update({ dna: parsed.data, edited_by_user: true }).eq("workspace_id", o.workspaceId).eq("version", o.version).eq("user_id", o.userId);
    return { version: o.version };
  }
  const { data: existing } = await admin.from("brand_dna_versions").select("version").eq("workspace_id", o.workspaceId);
  const version = nextVersion((existing ?? []).map((r) => Number(r.version)));
  await admin.from("brand_dna_versions").insert({
    user_id: o.userId,
    workspace_id: o.workspaceId,
    version,
    status: "draft",
    dna: parsed.data,
    research_id: row.research_id,
    kit_snapshot: row.kit_snapshot,
    edited_by_user: true,
  });
  return { version };
}

/**
 * ACC Brand DNA: versi ini aktif (versi lama → superseded), lalu diterapkan ke produksi: palet & kata terlarang ke
 * Brand Kit, Style DNA Designer jadi gaya Autopilot, campuran pilar & jam posting dari Socmed Specialist.
 */
export async function approveDna(admin: SupabaseClient, o: { userId: string; workspaceId: string; version: number }) {
  const { data: row } = await admin.from("brand_dna_versions").select("dna").eq("workspace_id", o.workspaceId).eq("user_id", o.userId).eq("version", o.version).maybeSingle();
  const parsed = brandDnaSchema.safeParse(row?.dna);
  if (!parsed.success) return { error: "not_found" as const };
  const dna = parsed.data;
  const now = new Date().toISOString();
  await admin.from("brand_dna_versions").update({ status: "superseded" }).eq("workspace_id", o.workspaceId).eq("user_id", o.userId).eq("status", "approved");
  await admin.from("brand_dna_versions").update({ status: "approved", approved_at: now }).eq("workspace_id", o.workspaceId).eq("user_id", o.userId).eq("version", o.version);

  const { data: ws } = await admin.from("workspaces").select("brand_kit").eq("id", o.workspaceId).eq("user_id", o.userId).single();
  const kit = { ...((ws?.brand_kit ?? {}) as Record<string, unknown>) };
  kit.color_primary = dna.designer.palette.primary.toUpperCase();
  kit.color_secondary = dna.designer.palette.secondary.toUpperCase();
  const forbidden = new Set([...String(kit.voice_dont ?? "").split(/[,;\n]+/), ...dna.copywriter.forbidden].map((x) => x.trim()).filter(Boolean));
  if (forbidden.size) kit.voice_dont = [...forbidden].join(", ").slice(0, 600);
  await admin
    .from("workspaces")
    .update({
      brand_kit: kit,
      brand_dna_version: o.version,
      onboarding_status: "approved",
      updated_at: now,
    })
    .eq("id", o.workspaceId)
    .eq("user_id", o.userId);

  const style = styleDnaFrom(dna);
  const { data: st } = await admin
    .from("brand_styles")
    .insert({
      user_id: o.userId,
      workspace_id: o.workspaceId,
      name: `${style.name}`.slice(0, 60),
      source: "reference",
      dna: style,
      analysis: `Brand DNA v${o.version}: ${dna.creative_director.big_idea}`.slice(0, 1200),
    })
    .select("id")
    .single();
  const mix = pillarMixFromDna(dna);
  const patch: Record<string, unknown> = {
    user_id: o.userId,
    workspace_id: o.workspaceId,
    updated_at: now,
    style_preset: null,
  };
  if (st) patch.style_id = st.id;
  if (mix) Object.assign(patch, { goal: "custom", pillar_mix: mix });
  if (dna.socmed.posting_times.length) patch.slot_times = [...dna.socmed.posting_times].sort();
  await admin.from("autopilot_settings").upsert(patch);
  return { version: o.version };
}
