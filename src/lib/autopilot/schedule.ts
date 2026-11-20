import { addDays } from "./plan";

/** Target stok konten ke depan: mingguan dibuat ulang bila sisa < 4 hari, bulanan bila sisa < 21 hari. */
export const COVERAGE_DAYS = { weekly: 4, monthly: 21 } as const;

/** Perlu membuat minggu berikutnya? `plannedUntil` = tanggal post terakhir yang belum ditolak. */
export function needsBatch(cadence: "weekly" | "monthly", plannedUntil: string | null, today: string) {
  if (!plannedUntil) return true;
  return plannedUntil < addDays(today, COVERAGE_DAYS[cadence] ?? 4);
}
