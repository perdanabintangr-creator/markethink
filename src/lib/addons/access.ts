import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCreditStatus } from "@/lib/credits";
import type { ToolAccessLite } from "./format";

/**
 * Hak pakai Tools Pro & Markethink Agent (paket all-in-1): ditentukan paket (feature flag `tools_pro` / `agent`)
 * dan saldo kredit bulanan. Admin selalu boleh.
 */
export async function getToolAccess(admin: SupabaseClient, profile: { id: string; role: string; plan_id: string }): Promise<ToolAccessLite> {
  const isAdmin = profile.role === "admin";
  const [{ data: flags }, credits] = await Promise.all([
    admin.from("feature_flags").select("key, enabled").eq("plan_id", profile.plan_id).in("key", ["tools_pro", "agent"]),
    getCreditStatus(profile.id),
  ]);
  const flag = (k: string) => isAdmin || Boolean(flags?.find((f) => f.key === k)?.enabled);
  return {
    allowed: flag("tools_pro"),
    agent: flag("agent"),
    isAdmin,
    isFree: profile.plan_id === "beta" && !isAdmin,
    planId: profile.plan_id,
    remaining: credits.remaining,
    monthLimit: credits.monthLimit,
  };
}
