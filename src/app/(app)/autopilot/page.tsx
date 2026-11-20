import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { autopilotAllowance } from "@/lib/autopilot/quota";
import { postsThisMonth } from "@/lib/autopilot/generate";
import { addDays, todayWib } from "@/lib/autopilot/plan";
import { AutopilotView, type ApPost, type ApSettings, type ApWorkspace } from "@/components/autopilot/autopilot-view";
import { AutopilotUpsell } from "@/components/autopilot/autopilot-upsell";
import { instagramStatus } from "@/lib/instagram";
import type { MediaStat } from "@/lib/autopilot/performance";

export const metadata = { title: "Autopilot Konten" };
export const dynamic = "force-dynamic";

export default async function AutopilotPage() {
  const { supabase, profile } = await requireUser();
  const lang = profile.language === "en" ? "en" : "id";
  const allowance = autopilotAllowance(profile.plan_id, profile.role);

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

  if (!allowance) return <AutopilotUpsell lang={lang} workspaces={workspaces} />;

  const today = todayWib();
  const [{ data: settingsRow }, { data: postRows }, used, instagram, { data: statRows }] = await Promise.all([
    supabase.from("autopilot_settings").select("workspace_id, enabled, cadence, posts_per_week, slot_times, focus, design, auto_publish, generating_at").maybeSingle(),
    supabase
      .from("social_posts")
      .select("id, post_date, post_time, kind, design, image_regens, permalink, error, title, pillar, funnel, slides, caption, alt_text, script, note, lint, status, media, updated_at")
      .gte("post_date", addDays(today, -14))
      .order("post_date", { ascending: true })
      .order("post_time", { ascending: true })
      .limit(300),
    postsThisMonth(createAdminClient(), profile.id),
    instagramStatus(profile.id),
    supabase
      .from("instagram_media_stats")
      .select("ig_media_id, posted_at, media_type, caption, permalink, likes, comments, reach, saved, shares, views")
      .gte("posted_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .limit(60),
  ]);

  const settings: ApSettings = {
    workspaceId: (settingsRow?.workspace_id as string | null) ?? workspaces[0]?.id ?? null,
    enabled: Boolean(settingsRow?.enabled),
    cadence: (settingsRow?.cadence as "weekly" | "monthly") ?? "weekly",
    postsPerWeek: Math.min(Number(settingsRow?.posts_per_week ?? 7), allowance.postsPerWeek),
    slotTimes: ((settingsRow?.slot_times as string[] | null) ?? ["12:00", "19:00"]).map((t) => t.slice(0, 5)),
    focus: (settingsRow?.focus as string | null) ?? "",
    autoPublish: Boolean(settingsRow?.auto_publish),
    design: ((settingsRow?.design as ApSettings["design"] | undefined) ?? "auto"),
    configured: Boolean(settingsRow),
  };
  const posts = (postRows ?? []).map((p) => ({ ...p, post_time: String(p.post_time).slice(0, 5) })) as ApPost[];

  return (
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
    />
  );
}
