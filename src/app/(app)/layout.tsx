import { requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { getAllowedTiers } from "@/lib/plan";
import { getDict } from "@/lib/i18n/dict";
import { AppShell } from "@/components/app/app-shell";
import { anyPaymentsEnabled } from "@/lib/payments/gateway";
import { sttEnabled } from "@/lib/voice/stt";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireUser();
  const [{ data: workspaces }, credits, allowedTiers, { data: plan }, { data: flags }] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name")
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("updated_at", { ascending: false }),
    getCreditStatus(user.id),
    getAllowedTiers(supabase, profile),
    supabase.from("plans").select("name").eq("id", profile.plan_id).maybeSingle(),
    supabase.from("feature_flags").select("key, enabled").eq("plan_id", profile.plan_id).in("key", ["free_models", "research"]),
  ]);
  return (
    <AppShell
      value={{
        user: {
          id: user.id,
          email: profile.email,
          name: profile.full_name,
          avatar: profile.avatar_url,
          role: profile.role,
        },
        lang: profile.language,
        t: getDict(profile.language),
        workspaces: workspaces ?? [],
        credits: { monthLimit: credits.monthLimit, remaining: credits.remaining },
        allowedTiers,
        planName: plan?.name ?? profile.plan_id,
        planId: profile.plan_id,
        personaRole: profile.persona_role ?? null,
        freeModels: profile.role !== "admin" && Boolean(flags?.find((f) => f.key === "free_models")?.enabled),
        researchAllowed: profile.role === "admin" || Boolean(flags?.find((f) => f.key === "research")?.enabled),
        payEnabled: anyPaymentsEnabled(),
        voiceStt: sttEnabled(),
      }}
    >
      {children}
    </AppShell>
  );
}
