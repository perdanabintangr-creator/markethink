import { requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { getAllowedTiers } from "@/lib/plan";
import { getDict } from "@/lib/i18n/dict";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireUser();
  const [{ data: workspaces }, credits, allowedTiers, { data: plan }] = await Promise.all([
    supabase.from("workspaces").select("id, name").order("updated_at", { ascending: false }),
    getCreditStatus(user.id),
    getAllowedTiers(supabase, profile),
    supabase.from("plans").select("name").eq("id", profile.plan_id).maybeSingle(),
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
        credits: { dailyLimit: credits.dailyLimit, remaining: credits.remaining },
        allowedTiers,
        planName: plan?.name ?? profile.plan_id,
      }}
    >
      {children}
    </AppShell>
  );
}
