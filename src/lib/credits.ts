import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditsForUsd, IDR_PER_CREDIT, IDR_PER_USD, nextDayResetWib, nextWeekResetWib, type QuotaBlock } from "@/lib/quota";

/**
 * Kredit Marqthink (Fase 1, ACC founder 15 Nov 2026): jatah MINGGUAN (reset Senin 00.00 WIB) + batas HARIAN
 * (reset 00.00 WIB) untuk semua fitur. 1 kredit ≈ Rp100 modal AI. Aksi memotong perkiraan dulu, lalu disesuaikan
 * ke biaya nyata (settleCredits). Kredit boleh pecahan (chat ringan ±0,3 kredit).
 */
export { creditsForUsd, IDR_PER_CREDIT, IDR_PER_USD };

export interface CreditStatus {
  /** Jatah minggu ini (nama lama dipertahankan agar kompatibel). */
  monthLimit: number;
  /** Terpakai minggu ini. */
  used: number;
  /** Sisa yang bisa dipakai sekarang: 0 bila jatah hari ini sudah habis. */
  remaining: number;
  day: { limit: number; used: number };
  /** Kenapa sedang tidak bisa dipakai (null = bisa). */
  blocked: QuotaBlock | null;
  dayResetAt: string;
  weekResetAt: string;
}

const EMPTY = (): CreditStatus => ({
  monthLimit: 0,
  used: 0,
  remaining: 0,
  day: { limit: 0, used: 0 },
  blocked: "weekly",
  dayResetAt: nextDayResetWib().toISOString(),
  weekResetAt: nextWeekResetWib().toISOString(),
});

export async function getCreditStatus(userId: string): Promise<CreditStatus> {
  try {
    const { data, error } = await createAdminClient()
      .rpc("get_quota_status", { p_user: userId })
      .single<{ week_limit: number | string; week_used: number | string; day_limit: number | string; day_used: number | string }>();
    if (error || !data) return EMPTY();
    const weekLimit = Number(data.week_limit);
    const weekUsed = Math.max(0, Number(data.week_used));
    const dayLimit = Number(data.day_limit);
    const dayUsed = Math.max(0, Number(data.day_used));
    const weekLeft = Math.max(0, weekLimit - weekUsed);
    const blocked: QuotaBlock | null = dayUsed >= dayLimit ? "daily" : weekLeft <= 0 ? "weekly" : null;
    return {
      monthLimit: weekLimit,
      used: weekUsed,
      remaining: blocked === "daily" ? 0 : weekLeft,
      day: { limit: dayLimit, used: dayUsed },
      blocked,
      dayResetAt: nextDayResetWib().toISOString(),
      weekResetAt: nextWeekResetWib().toISOString(),
    };
  } catch (err) {
    console.error("[credits] status gagal", err);
    return EMPTY();
  }
}

/** Potong kredit di awal. `reason` berisi alasan penolakan: daily | weekly | director | no_plan. */
export async function consumeCredits(userId: string, amount: number, reason: string, meta?: Record<string, unknown>) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("quota_consume", { p_user: userId, p_amount: amount, p_reason: reason, p_meta: meta ?? null })
    .single<{ ok: boolean; remaining: number | string; reason: string | null }>();
  if (error) throw error;
  if (!data) return { ok: false, remaining: 0, reason: "weekly" as QuotaBlock };
  return { ok: data.ok, remaining: Number(data.remaining), reason: (data.reason ?? null) as QuotaBlock | null };
}

/** Kembalikan kredit. `meta.tier` ikut dicatat agar porsi Director ikut berkurang saat dikembalikan. */
export async function refundCredits(userId: string, amount: number, reason: string, meta?: Record<string, unknown>) {
  if (amount <= 0) return;
  const admin = createAdminClient();
  await admin.from("credit_ledger").insert({ user_id: userId, delta: amount, kind: "refund", reason, meta: meta ?? null });
}

/**
 * Sesuaikan potongan awal ke biaya nyata: `actual - charged` > 0 → potong tambahan, < 0 → kembalikan selisih.
 * Mengembalikan sisa jatah minggu ini.
 */
export async function settleCredits(userId: string, charged: number, actual: number, reason: string, meta?: Record<string, unknown>) {
  const { data } = await createAdminClient().rpc("quota_settle", {
    p_user: userId,
    p_delta: Math.round((actual - charged) * 100) / 100,
    p_reason: reason,
    p_meta: meta ?? null,
  });
  return data === null || data === undefined ? null : Number(data);
}
