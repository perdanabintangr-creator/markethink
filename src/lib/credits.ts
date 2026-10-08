import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreditStatus {
  dailyLimit: number;
  used: number;
  remaining: number;
}

export async function getCreditStatus(userId: string): Promise<CreditStatus> {
  let result;
  try {
    result = await createAdminClient().rpc("get_credit_status", { p_user: userId }).single<{
      daily_limit: number;
      used: number;
      remaining: number;
    }>();
  } catch (err) {
    console.error("[credits] status gagal", err);
    return { dailyLimit: 0, used: 0, remaining: 0 };
  }
  const { data, error } = result;
  if (error || !data) return { dailyLimit: 0, used: 0, remaining: 0 };
  return { dailyLimit: data.daily_limit, used: data.used, remaining: data.remaining };
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
  const admin = createAdminClient();
  await admin.from("credit_ledger").insert({ user_id: userId, delta: amount, kind: "refund", reason });
}
