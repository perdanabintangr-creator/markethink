import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { presetById } from "./presets";
import { parseDna, type StyleDna } from "./style";

/** DNA Gaya aktif di pengaturan Autopilot: gaya dari referensi (style_id) → gaya industri (style_preset) → null. */
export async function activeStyle(admin: SupabaseClient, userId: string, settings?: { style_id?: string | null; style_preset?: string | null } | null): Promise<StyleDna | null> {
  let s = settings;
  if (s === undefined) {
    const { data } = await admin.from("autopilot_settings").select("style_id, style_preset").eq("user_id", userId).maybeSingle();
    s = data;
  }
  if (s?.style_id) {
    const { data } = await admin.from("brand_styles").select("dna").eq("id", s.style_id).eq("user_id", userId).maybeSingle();
    const dna = parseDna(data?.dna);
    if (dna) return dna;
  }
  return presetById(s?.style_preset)?.dna ?? null;
}
