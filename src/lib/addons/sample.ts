/**
 * Hitung jumlah responden minimum (rumus Cochran + koreksi populasi terbatas).
 * Dipakai di form (pratinjau langsung) & di hasil — dihitung program, bukan AI.
 */
export function sampleSize(marginPct: number, population = 0, confidence: 90 | 95 | 99 = 95) {
  const z = confidence === 99 ? 2.576 : confidence === 90 ? 1.645 : 1.96;
  const e = marginPct / 100;
  const n0 = (z * z * 0.25) / (e * e);
  const n = population > 0 ? n0 / (1 + (n0 - 1) / population) : n0;
  const min = Math.ceil(n);
  // +20% cadangan untuk jawaban tidak valid / tidak lolos screener.
  return { n: min, recommended: Math.ceil(min * 1.2), margin: marginPct, confidence, population: population > 0 ? population : null };
}
