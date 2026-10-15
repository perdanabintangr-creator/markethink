/** Otak untuk Tools Pro & Markethink Agent: Associate (default) atau Director (paket yang membuka tier Director). */
export const TOOL_TIERS = ["associate", "director"] as const;
export type ToolTier = (typeof TOOL_TIERS)[number];
export const DEFAULT_TOOL_TIER: ToolTier = "associate";
export const TOOL_TIER_KEY = "mt_tool_tier";

export const TOOL_TIER_INFO: Record<ToolTier, { label: string; hint: string }> = {
  associate: { label: "Associate", hint: "Deep reasoning — tajam & cepat untuk kebanyakan pekerjaan." },
  director: { label: "Director", hint: "Otak paling pintar — analisis terdalam (paket Promax). Lebih lama diproses." },
};

/** Pilihan user → otak yang boleh dipakai. Director hanya bila paketnya membuka tier Director; selain itu Associate. */
export function resolveToolTier(requested: unknown, allowed: readonly string[]): ToolTier {
  return requested === "director" && allowed.includes("director") ? "director" : DEFAULT_TOOL_TIER;
}

/** Pilihan otak terakhir user (browser). */
export function readToolTierPref(): ToolTier {
  try {
    return localStorage.getItem(TOOL_TIER_KEY) === "director" ? "director" : DEFAULT_TOOL_TIER;
  } catch {
    return DEFAULT_TOOL_TIER;
  }
}
