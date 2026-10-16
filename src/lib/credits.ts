import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Kredit Markethink: satu dompet per BULAN (reset tgl 1, 00.00 WIB) untuk semua fitur.
 * 1 kredit ≈ Rp100 modal AI. Aksi memotong perkiraan dulu, lalu disesuaikan ke biaya nyata (settleCredits).
 */
export const IDR_PER_USD = Number(process.env.IDR_PER_USD) || 16_500;
export const IDR_PER_CREDIT = 100;

/** Biaya AI (USD) → kredit (dibulatkan ke atas, minimal 1). */
export function creditsForUsd(usd: number) {
  return Math.max(1, Math.ceil((Math.max(0, usd) * IDR_PER_USD) / IDR_PER_CREDIT));
}

export interface CreditStatus {
  /** Jatah kredit bulan ini. */
  monthLimit: number;
  used: number;
  remaining: number;
}

export async function getCreditStatus(userId: string): Promise<CreditStatus> {
  try {
    const { data, error } = await createAdminClient()
      .rpc("get_credit_balance", { p_user: userId })
      .single<{ month_limit: number; used: number; remaining: number }>();
    if (error || !data) return { monthLimit: 0, used: 0, remaining: 0 };
    return { monthLimit: data.month_limit, used: data.used, remaining: data.remaining };
  } catch (err) {
    console.error("[credits] status gagal", err);
    return { monthLimit: 0, used: 0, remaining: 0 };
  }
}

export async function consumeCredits(userId: string, amount: number, reason: string, meta?: Record<string, unknown>) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("consume_credits", { p_user: userId, p_amount: amount, p_reason: reason, p_meta: meta ?? null })
    .single<{ ok: boolean; remaining: number }>();
  if (error) throw error;
  return data ?? { ok: false, remaining: 0 };
}

export async function refundCredits(userId: string, amount: number, reason: string) {
  if (amount <= 0) return;
  const admin = createAdminClient();
  await admin.from("credit_ledger").insert({ user_id: userId, delta: amount, kind: "refund", reason });
}

/**
 * Sesuaikan potongan awal ke biaya nyata: `actual - charged` > 0 → potong tambahan, < 0 → kembalikan selisih.
 * Mengembalikan sisa kredit terbaru.
 */
export async function settleCredits(userId: string, charged: number, actual: number, reason: string, meta?: Record<string, unknown>) {
  const { data } = await createAdminClient().rpc("settle_credits", {
    p_user: userId,
    p_delta: actual - charged,
    p_reason: reason,
    p_meta: meta ?? null,
  });
  return typeof data === "number" ? data : null;
}
