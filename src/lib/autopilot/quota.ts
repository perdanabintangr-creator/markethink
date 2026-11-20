/**
 * Jatah Autopilot Konten per paket (masuk paket, tidak memotong kredit chat; biaya AI tetap dicatat di usage_logs).
 * Pro: maks 7 post/minggu, 30 post/bulan. Promax: maks 14 post/minggu, 60 post/bulan. Paket lain: belum termasuk
 * (nanti bisa dibeli eceran).
 */
export interface AutopilotAllowance {
  postsPerWeek: number;
  postsPerMonth: number;
}

export const AUTOPILOT_PLANS: Record<string, AutopilotAllowance> = {
  pro: { postsPerWeek: 7, postsPerMonth: 30 },
  promax: { postsPerWeek: 14, postsPerMonth: 60 },
};

export function autopilotAllowance(planId: string | null | undefined, role?: string | null): AutopilotAllowance | null {
  if (role === "admin") return AUTOPILOT_PLANS.promax;
  return (planId && AUTOPILOT_PLANS[planId]) || null;
}

/** Awal bulan ini (tanggal 1, 00.00 WIB) sebagai Date UTC. */
export function monthStartWib(now = new Date()) {
  const wib = new Date(now.getTime() + 7 * 3_600_000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1) - 7 * 3_600_000);
}
