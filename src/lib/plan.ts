import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TierId } from "@/lib/ai/models.config";
import type { Profile } from "@/lib/auth";

const ALL_TIERS: TierId[] = ["junior", "senior", "associate"];

/**
 * Tier otak yang boleh dipakai user, dari feature_flags paketnya (`tier.junior`, dst).
 * Admin selalu boleh semua. Paket bisa diatur admin tanpa deploy.
 */
export async function getAllowedTiers(supabase: SupabaseClient, profile: Profile): Promise<TierId[]> {
  if (profile.role === "admin") return ALL_TIERS;
  const { data } = await supabase
    .from("feature_flags")
    .select("key, enabled")
    .eq("plan_id", profile.plan_id)
    .like("key", "tier.%");
  const allowed = ALL_TIERS.filter((t) => data?.some((f) => f.key === `tier.${t}` && f.enabled));
  return allowed.length ? allowed : ["junior"];
}

