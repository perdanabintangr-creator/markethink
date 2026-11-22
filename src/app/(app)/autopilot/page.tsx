import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Suspense } from "react";
import { getContentAccess, postsInPeriod } from "@/lib/autopilot/content-access";
import { getContentOffers } from "@/lib/autopilot/content-offers";
import { ContentPlanBar } from "@/components/autopilot/content-plan-bar";
import { PaymentReturn } from "@/components/tools/payment-return";
import { addDays, todayWib } from "@/lib/autopilot/plan";
import { AutopilotView, type ApPost, type ApSettings, type ApWorkspace } from "@/components/autopilot/autopilot-view";
import { AutopilotUpsell } from "@/components/autopilot/autopilot-upsell";
import { instagramStatus } from "@/lib/instagram";
import type { MediaStat } from "@/lib/autopilot/performance";
import type { BrandStyleRow } from "@/components/autopilot/style-section";
import type { ProductItem } from "@/components/autopilot/products-section";
import type { IdeaItem } from "@/components/autopilot/ideas-section";
import type { ResearchRow } from "@/components/autopilot/research-card";
import { existingSamples } from "@/lib/autopilot/sample-images";
import { STYLE_PRESETS } from "@/lib/autopilot/presets";
import Link from "next/link";
import { loadOnboarding } from "@/lib/brand/server";
import { autopilotGate, kitChanged } from "@/lib/brand/onboarding";
import { BrandGate } from "@/components/brand/brand-gate";

export const metadata = { title: "Autopilot Konten" };
export const dynamic = "force-dynamic";

export default async function AutopilotPage() {
  const { supabase, profile } = await requireUser();
  const lang = profile.language === "en" ? "en" : "id";
  // Autopilot Konten dijual sebagai paket tersendiri (bisa dibeli semua paket, termasuk Free).
  const allowance = await getContentAccess(createAdminClient(), profile.id, profile.role);

  const { data: wsRows } = await supabase.from("workspaces").select("id, name, brand_kit").order("created_at", { ascending: true }).limit(50);
  const workspaces: ApWorkspace[] = (wsRows ?? []).map((w) => {
    const kit = (w.brand_kit ?? {}) as Record<string, unknown>;
    return {
      id: w.id as string,
      name: w.name as string,
      color: typeof kit.color_primary === "string" ? kit.color_primary : null,
      logoId: typeof kit.logo_id === "string" ? kit.logo_id : null,
      handle: typeof kit.social_handle === "string" ? kit.social_handle : null,
    };
  });

  if (!allowance)
    return (
      <>
        <Suspense>
          <div className="mx-auto w-full max-w-6xl px-4 pt-4">
            <PaymentReturn />
          </div>
        </Suspense>
        <AutopilotUpsell lang={lang} workspaces={workspaces} offers={await getContentOffers(createAdminClient())} />
      </>
    );

  const today = todayWib();
  const { data: settingsRow0 } = await supabase.from("autopilot_settings").select("workspace_id").maybeSingle();
  const [{ data: settingsRow }, { data: postRows }, used, instagram, { data: statRows }, { data: styleRows }, { data: productRows }, { data: researchRow }, { data: ideaRows }] =
    await Promise.all([
      supabase
        .from("autopilot_settings")
        .select(
          "workspace_id, enabled, cadence, posts_per_week, slot_times, focus, design, auto_publish, goal, pillar_mix, review_ideas, industry, style_preset, style_id, generating_at",
        )
        .maybeSingle(),
      supabase
        .from("social_posts")
        .select(
          "id, post_date, post_time, kind, design, product_id, image_regens, permalink, error, team_review, created_at, title, pillar, funnel, slides, caption, alt_text, script, note, lint, status, media, updated_at",
        )
        .gte("post_date", addDays(today, -14))
        .order("post_date", { ascending: true })
        .order("post_time", { ascending: true })
        .limit(300),
      postsInPeriod(createAdminClient(), profile.id, allowance),
      instagramStatus(profile.id),
      supabase
        .from("instagram_media_stats")
        .select("ig_media_id, posted_at, media_type, caption, permalink, likes, comments, reach, saved, shares, views")
        .gte("posted_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
        .limit(60),
      supabase.from("brand_styles").select("id, name, dna, analysis, updated_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("brand_products").select("id, name, sku, price, description, photo_paths, active, updated_at").order("created_at", { ascending: false }).limit(200),
      // Riset brand terbaru untuk project aktif.
      supabase
        .from("brand_research")
        .select("id, data, images, created_at")
        .eq("workspace_id", (settingsRow0?.workspace_id as string | null) ?? workspaces[0]?.id ?? "00000000-0000-0000-0000-000000000000")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("autopilot_ideas")
        .select("id, batch_id, post_date, post_time, kind, pillar, funnel, title, angle, hook, reason")
        .eq("status", "pending")
        .order("post_date")
        .order("post_time")
        .limit(30),
    ]);

  const settings: ApSettings = {
    workspaceId: (settingsRow?.workspace_id as string | null) ?? workspaces[0]?.id ?? null,
    enabled: Boolean(settingsRow?.enabled),
    cadence: (settingsRow?.cadence as "weekly" | "monthly") ?? "weekly",
    postsPerWeek: Math.min(Number(settingsRow?.posts_per_week ?? 7), allowance.postsPerWeek),
    slotTimes: ((settingsRow?.slot_times as string[] | null) ?? ["12:00", "19:00"]).map((t) => t.slice(0, 5)),
    focus: (settingsRow?.focus as string | null) ?? "",
    autoPublish: Boolean(settingsRow?.auto_publish),
    goal: (settingsRow?.goal as ApSettings["goal"] | undefined) ?? "balanced",
    pillarMix: (settingsRow?.pillar_mix as ApSettings["pillarMix"]) ?? null,
    reviewIdeas: Boolean(settingsRow?.review_ideas),
    design: (settingsRow?.design as ApSettings["design"] | undefined) ?? "auto",
    configured: Boolean(settingsRow),
  };
  const posts = (postRows ?? []).map((p) => ({ ...p, post_time: String(p.post_time).slice(0, 5) })) as ApPost[];

  // Gate Brand Onboarding: Autopilot terbuka setelah data wajib lengkap + Brand DNA di-ACC.
  const ob = settings.workspaceId ? await loadOnboarding(createAdminClient(), profile.id, settings.workspaceId) : null;
  const gate = autopilotGate({ workspaceId: ob ? settings.workspaceId : null, requiredDone: Boolean(ob?.completeness.requiredDone), approvedVersion: ob?.approvedVersion ?? null });
  if (gate)
    return (
      <BrandGate
        reason={gate}
        brandName={ob ? String(ob.ws.name) : null}
        workspaceId={settings.workspaceId}
        percent={ob?.completeness.percent ?? 0}
        missing={ob?.completeness.missing ?? []}
        hasDraft={Boolean(ob?.versions.some((v) => v.status === "draft"))}
      />
    );
  const active = ob?.versions.find((v) => Number(v.version) === ob.approvedVersion);
  const dnaStale = ob && active ? kitChanged(active.kit_snapshot as Record<string, unknown> | null, { ...ob.kit, _assets: ob.assets.length }) : false;

  return (
    <div className="flex h-full flex-col">
      <Suspense>
        <div className="mx-auto w-full max-w-6xl shrink-0 px-4 pt-3 md:px-6">
          <PaymentReturn />
        </div>
      </Suspense>
      <ContentPlanBar planId={allowance.planId} name={allowance.name} periodEnd={allowance.periodEnd} used={used} limit={allowance.postsPerMonth} />
      {dnaStale && (
        <div className="mx-auto mt-4 w-full max-w-6xl shrink-0 px-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            <span>Brand Kit berubah sejak Brand DNA v{ob?.approvedVersion} di-ACC.</span>
            <Link href={`/autopilot/onboarding?ws=${settings.workspaceId}`} className="font-medium underline">
              Perbarui Brand DNA
            </Link>
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <AutopilotView
          lang={lang}
          today={today}
          initialSettings={settings}
          initialPosts={posts}
          workspaces={workspaces}
          allowance={allowance}
          usedThisMonth={used}
          instagram={instagram}
          stats={(statRows ?? []) as MediaStat[]}
          products={(productRows ?? []) as ProductItem[]}
          research={(researchRow as ResearchRow | null) ?? null}
          ideas={(ideaRows ?? []).map((r) => ({ ...r, post_time: String(r.post_time) })) as IdeaItem[]}
          styleState={{
            industry: (settingsRow?.industry as string | null) ?? null,
            presetId: (settingsRow?.style_preset as string | null) ?? null,
            styleId: (settingsRow?.style_id as string | null) ?? null,
            styles: (styleRows ?? []) as BrandStyleRow[],
            samples:
              profile.role === "admin"
                ? { ready: [...(await existingSamples(createAdminClient()))].filter((id) => STYLE_PRESETS.some((p) => p.id === id)).length, total: STYLE_PRESETS.length }
                : null,
          }}
        />
      </div>
    </div>
  );
}
