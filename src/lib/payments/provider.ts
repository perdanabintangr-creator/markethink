/**
 * Interface payment gateway. Implementasi Midtrans/Xendit menyusul di Fase 7.
 * Semua provider harus memetakan event-nya ke bentuk PaymentEvent agar
 * logika subscription & top-up kredit tidak tergantung vendor.
 */
export interface CheckoutRequest {
  userId: string;
  email: string;
  planId?: string;
  topupCredits?: number;
  amountIdr: number;
  returnUrl: string;
}

export interface CheckoutSession {
  provider: string;
  reference: string;
  redirectUrl: string;
}

export type PaymentEventType = "payment.succeeded" | "payment.failed" | "subscription.renewed" | "subscription.canceled";

export interface PaymentEvent {
  type: PaymentEventType;
  reference: string;
  userId?: string;
  planId?: string;
  topupCredits?: number;
  amountIdr?: number;
  raw: unknown;
}

export interface PaymentProvider {
  readonly id: "midtrans" | "xendit";
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Verifikasi signature webhook; lempar error jika tidak valid. */
  verifyWebhook(headers: Headers, rawBody: string): Promise<PaymentEvent>;
}

export function getPaymentProvider(): PaymentProvider | null {
  // Belum diaktifkan pada fase beta.
  return null;
}
