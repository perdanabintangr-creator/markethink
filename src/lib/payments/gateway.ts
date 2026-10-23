import "server-only";
import { duitkuEnabled } from "./duitku";
import { paymentsEnabled as midtransEnabled } from "./midtrans";

export type PaymentProvider = "duitku" | "midtrans";

/**
 * Gateway yang dipakai untuk pembayaran baru. PAYMENT_PROVIDER ("duitku" / "midtrans") memilih secara eksplisit;
 * tanpa itu Duitku diutamakan bila key-nya terpasang, lalu Midtrans. Pembayaran lama tetap dicek ke gateway asalnya.
 */
export function activeProvider(pref = process.env.PAYMENT_PROVIDER?.trim()): PaymentProvider | null {
  if (pref === "duitku" && duitkuEnabled()) return "duitku";
  if (pref === "midtrans" && midtransEnabled()) return "midtrans";
  if (duitkuEnabled()) return "duitku";
  if (midtransEnabled()) return "midtrans";
  return null;
}

export const anyPaymentsEnabled = () => activeProvider() !== null;
