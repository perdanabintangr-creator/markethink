import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";

/** Batas jumlah project per paket, dari feature_flags `workspaces` value `{"max": N}`. Admin 200. */
export async function projectLimit(supabase: SupabaseClient, profile: Profile) {
  if (profile.role === "admin") return 200;
  const { data } = await supabase
    .from("feature_flags")
    .select("enabled, value")
    .eq("plan_id", profile.plan_id)
    .eq("key", "workspaces")
    .maybeSingle();
  if (data && !data.enabled) return 0;
  const max = (data?.value as { max?: unknown } | null)?.max;
  return typeof max === "number" ? max : 20;
}

export type CreateProjectResult = { id: string; name: string } | { error: "invalid_name" | "limit_reached"; limit?: number };

export async function createProject(supabase: SupabaseClient, profile: Profile, rawName: unknown): Promise<CreateProjectResult> {
  const name = String(rawName ?? "").trim().slice(0, 80);
  if (!name) return { error: "invalid_name" };
  const [limit, { count }] = await Promise.all([
    projectLimit(supabase, profile),
    supabase.from("workspaces").select("id", { count: "exact", head: true }),
  ]);
  if ((count ?? 0) >= limit) return { error: "limit_reached", limit };
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ user_id: profile.id, name, brand_kit: {} })
    .select("id, name")
    .single();
  if (error || !data) return { error: "invalid_name" };
  return { id: data.id as string, name: data.name as string };
}
