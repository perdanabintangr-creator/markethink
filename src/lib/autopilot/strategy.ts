import { z } from "zod";

/**
 * Tujuan konten & campuran pilar Autopilot. Pelanggan memilih tujuan (atau atur sendiri); jumlah post per pilar
 * dihitung pasti untuk tiap minggu. Modul murni (diuji vitest).
 */

export const GOALS = ["balanced", "awareness", "engagement", "sales", "custom"] as const;
export type Goal = (typeof GOALS)[number];

export const PILLAR_KEYS = ["edukasi", "relatable", "insight", "produk"] as const;
export type PillarKey = (typeof PILLAR_KEYS)[number];
export type PillarMix = Record<PillarKey, number>;

/** Nama pilar seperti yang ditulis AI (kolom `pillar`). */
export const PILLAR_NAME: Record<PillarKey, string> = {
  edukasi: "Edukasi",
  relatable: "Relatable",
  insight: "Insight & momen",
  produk: "Produk/BTS",
};

export const GOAL_MIX: Record<Exclude<Goal, "custom">, PillarMix> = {
  balanced: { edukasi: 40, relatable: 30, insight: 10, produk: 20 },
  awareness: { edukasi: 35, relatable: 40, insight: 15, produk: 10 },
  engagement: { edukasi: 25, relatable: 45, insight: 15, produk: 15 },
  sales: { edukasi: 25, relatable: 20, insight: 10, produk: 45 },
};

const GOAL_BRIEF: Record<Exclude<Goal, "custom">, string> = {
  balanced: "Seimbang: bangun kepercayaan lewat edukasi & hiburan, sisipkan produk secara wajar. Funnel campur Awareness, Consideration, Acquisition.",
  awareness:
    "Kenalkan brand ke orang baru: prioritaskan konten yang mudah dibagikan & disimpan (relatable, tips praktis, momen). Funnel dominan Awareness; Reel & carousel edukasi untuk jangkauan.",
  engagement:
    "Bangun interaksi: polling, pertanyaan, opini ringan, 'kamu tim mana', cerita relatable yang memancing komentar. Funnel dominan Consideration; ajakan komentar/DM.",
  sales:
    "Dorong penjualan: tonjolkan produk (manfaat, cara pakai, bukti dari data brand, promo HANYA bila ada di data/fokus). Funnel dominan Consideration & Acquisition; ajakan DM/klik link bio/beli.",
};

export const pillarMixSchema = z.object({
  edukasi: z.number().int().min(0).max(100),
  relatable: z.number().int().min(0).max(100),
  insight: z.number().int().min(0).max(100),
  produk: z.number().int().min(0).max(100),
});

/** Campuran untuk tujuan ini (custom → campuran milik user, dinormalisasi ke 100). */
export function mixFor(goal: string | null | undefined, custom?: unknown): PillarMix {
  if (goal === "custom") {
    const c = pillarMixSchema.safeParse(custom);
    if (c.success) {
      const total = PILLAR_KEYS.reduce((a, k) => a + c.data[k], 0);
      if (total > 0) return Object.fromEntries(PILLAR_KEYS.map((k) => [k, Math.round((c.data[k] / total) * 100)])) as PillarMix;
    }
  }
  return GOAL_MIX[(GOALS as readonly string[]).includes(goal ?? "") && goal !== "custom" ? (goal as Exclude<Goal, "custom">) : "balanced"];
}

/** Bagi `n` post ke pilar sesuai persentase (sisa terbesar), total selalu = n. */
export function pillarCounts(n: number, mix: PillarMix): PillarMix {
  const raw = PILLAR_KEYS.map((k) => ({ k, v: (mix[k] / 100) * n }));
  const out = Object.fromEntries(raw.map((r) => [r.k, Math.floor(r.v)])) as PillarMix;
  let left = n - PILLAR_KEYS.reduce((a, k) => a + out[k], 0);
  for (const r of [...raw].sort((a, b) => b.v - Math.floor(b.v) - (a.v - Math.floor(a.v)))) {
    if (left <= 0) break;
    if (mix[r.k] > 0) {
      out[r.k]++;
      left--;
    }
  }
  return out;
}

/** Blok strategi untuk prompt (jumlah pasti per pilar + arahan tujuan). */
export function strategyBlock(goal: string | null | undefined, custom: unknown, n: number) {
  const mix = mixFor(goal, custom);
  const counts = pillarCounts(n, mix);
  const brief = goal === "custom" ? "Campuran diatur sendiri oleh pemilik brand; ikuti jumlahnya persis." : GOAL_BRIEF[(goal as Exclude<Goal, "custom">) in GOAL_BRIEF ? (goal as Exclude<Goal, "custom">) : "balanced"];
  const list = PILLAR_KEYS.filter((k) => counts[k] > 0).map((k) => `${counts[k]} ${PILLAR_NAME[k]}`);
  return `TUJUAN KONTEN: ${brief}
CAMPURAN PILAR MINGGU INI (WAJIB, total ${n} post): ${list.join(", ")}. Pakai nama pilar persis: ${PILLAR_KEYS.map((k) => PILLAR_NAME[k]).join(" | ")}.`;
}
