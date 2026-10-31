/**
 * Otak untuk Tools Pro & Marqthink Agent: Senior (default), Head, Director — sesuai tier yang dibuka paket user.
 * Director memakai 2 kuota per hasil (biaya AI ±5× Senior).
 */
export const TOOL_TIERS = ["senior", "associate", "director"] as const;
export type ToolTier = (typeof TOOL_TIERS)[number];
export const DEFAULT_TOOL_TIER: ToolTier = "senior";
export const quotaUnits = (tier: ToolTier) => (tier === "director" ? 2 : 1);
export const TOOL_TIER_KEY = "mt_tool_tier";

export const TOOL_TIER_INFO: Record<ToolTier, { label: string; hint: string }> = {
  senior: { label: "Senior", hint: "Seimbang, cepat & tajam untuk kebanyakan pekerjaan." },
  associate: { label: "Head", hint: "Deep reasoning: analisis lebih dalam (paket Pro/Promax). Sedikit lebih lama." },
  director: { label: "Director", hint: "Otak paling pintar (paket Promax). Memakai 2 kuota per hasil dan paling lama diproses." },
};

/** Pilihan user → otak yang boleh dipakai sesuai tier yang dibuka paketnya; selain itu Senior. */
export function resolveToolTier(requested: unknown, allowed: readonly string[]): ToolTier {
  return (requested === "associate" || requested === "director") && allowed.includes(requested) ? requested : DEFAULT_TOOL_TIER;
}

/** Pilihan otak terakhir user (browser). */
export function readToolTierPref(): ToolTier {
  try {
    const v = localStorage.getItem(TOOL_TIER_KEY);
    return v === "associate" || v === "director" ? v : DEFAULT_TOOL_TIER;
  } catch {
    return DEFAULT_TOOL_TIER;
  }
}
