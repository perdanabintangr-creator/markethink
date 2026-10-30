import "server-only";
import { duitkuEnabled } from "./duitku";
import { mayarEnabled } from "./mayar";
import { paymentsEnabled as midtransEnabled } from "./midtrans";

export type PaymentProvider = "mayar" | "duitku" | "midtrans";

/**
 * Gateway yang dipakai untuk pembayaran baru. PAYMENT_PROVIDER ("mayar" / "duitku" / "midtrans") memilih secara eksplisit;
 * tanpa itu Mayar diutamakan bila key-nya terpasang, lalu Duitku, lalu Midtrans. Pembayaran lama tetap dicek ke gateway asalnya.
 */
export function activeProvider(pref = process.env.PAYMENT_PROVIDER?.trim()): PaymentProvider | null {
  if (pref === "mayar" && mayarEnabled()) return "mayar";
  if (pref === "duitku" && duitkuEnabled()) return "duitku";
  if (pref === "midtrans" && midtransEnabled()) return "midtrans";
  if (mayarEnabled()) return "mayar";
  if (duitkuEnabled()) return "duitku";
  if (midtransEnabled()) return "midtrans";
  return null;
}

export const anyPaymentsEnabled = () => activeProvider() !== null;
