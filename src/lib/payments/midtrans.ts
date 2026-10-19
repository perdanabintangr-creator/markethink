import "server-only";
import { createHash } from "crypto";

/**
 * Midtrans Snap (halaman bayar QRIS, VA, e-wallet). Alamat API sama dengan paket resmi `midtrans-client`.
 * Env: MIDTRANS_SERVER_KEY (wajib), MIDTRANS_IS_PRODUCTION="true" untuk mode live (default sandbox).
 */
const SNAP = { sandbox: "https://app.sandbox.midtrans.com/snap/v1", production: "https://app.midtrans.com/snap/v1" };
const CORE = { sandbox: "https://api.sandbox.midtrans.com", production: "https://api.midtrans.com" };

const serverKey = () => process.env.MIDTRANS_SERVER_KEY?.trim() ?? "";
/**
 * Mode: sandbox kecuali MIDTRANS_IS_PRODUCTION="true". Tidak ditebak dari awalan key: akun Midtrans baru memakai key
 * sandbox tanpa awalan "SB-", jadi tebakan bisa salah dan mengirim transaksi uji ke server live.
 */
export function modeOf(_key: string, flag = process.env.MIDTRANS_IS_PRODUCTION): "sandbox" | "production" {
  return flag === "true" ? "production" : "sandbox";
}
const mode = () => modeOf(serverKey());

export const paymentsEnabled = () => Boolean(serverKey());
export const paymentsMode = mode;

const auth = () => `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`;

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: auth(), ...init.headers },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!res.ok && !(data && typeof data === "object" && "status_code" in data)) {
    // 401 hampir selalu berarti Server Key tidak cocok dengan mode (kunci sandbox di mode production atau sebaliknya).
    const hint = res.status === 401 ? ` [mode ${modeOf(serverKey())}: cek MIDTRANS_SERVER_KEY & MIDTRANS_IS_PRODUCTION]` : "";
    throw new Error(`midtrans ${res.status}${hint}: ${text.slice(0, 300)}`);
  }
  return data as T;
}

export interface SnapParams {
  orderId: string;
  amount: number;
  item: { id: string; name: string };
  customer: { name?: string | null; email?: string | null };
  finishUrl: string;
}

/**
 * Metode bayar yang ditampilkan Snap, sesuai urutan. QRIS umum (other_qris, diproses lewat GoPay QRIS, biaya 0,7%) paling atas;
 * GoPay e-money (4% untuk produk digital) sengaja tidak dimasukkan karena pengguna GoPay tetap bisa scan QRIS. Metode yang belum
 * aktif di akun Midtrans otomatis tidak tampil.
 */
export const ENABLED_PAYMENTS = ["other_qris", "bca_va", "bni_va", "bri_va", "echannel", "permata_va", "cimb_va", "bsi_va"];

/** Buat transaksi Snap → token + URL halaman bayar Midtrans. */
export async function createSnapTransaction(p: SnapParams) {
  const body = {
    transaction_details: { order_id: p.orderId, gross_amount: p.amount },
    item_details: [{ id: p.item.id.slice(0, 50), price: p.amount, quantity: 1, name: p.item.name.slice(0, 50) }],
    customer_details: { first_name: (p.customer.name || p.customer.email || "Pelanggan").slice(0, 50), email: p.customer.email ?? undefined },
    enabled_payments: ENABLED_PAYMENTS,
    callbacks: { finish: p.finishUrl },
    expiry: { unit: "hours", duration: 24 },
  };
  const res = await call<{ token?: string; redirect_url?: string; error_messages?: string[] }>(`${SNAP[mode()]}/transactions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.token || !res.redirect_url) throw new Error(`snap: ${(res.error_messages ?? []).join("; ") || "tanpa token"}`);
  return { token: res.token, redirectUrl: res.redirect_url };
}

export interface MidtransStatus {
  status_code?: string;
  order_id?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  signature_key?: string;
  settlement_time?: string;
}

/** Status transaksi langsung dari Midtrans (sumber kebenaran; notifikasi selalu dicek ulang ke sini). */
export function getTransactionStatus(orderId: string) {
  return call<MidtransStatus>(`${CORE[mode()]}/v2/${encodeURIComponent(orderId)}/status`);
}

/** Tanda tangan notifikasi Midtrans: SHA512(order_id + status_code + gross_amount + server key). */
export function validSignature(n: MidtransStatus, key = serverKey()) {
  if (!n.signature_key || !n.order_id || !n.status_code || !n.gross_amount || !key) return false;
  const expected = createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}${key}`).digest("hex");
  return expected === n.signature_key;
}

/** Status Midtrans → status pembayaran Markethink. */
export function paymentStatusOf(s: Pick<MidtransStatus, "transaction_status" | "fraud_status">): "paid" | "pending" | "failed" | "expired" | "canceled" {
  switch (s.transaction_status) {
    case "settlement":
      return "paid";
    case "capture":
      return s.fraud_status === "accept" || !s.fraud_status ? "paid" : "pending";
    case "expire":
      return "expired";
    case "cancel":
      return "canceled";
    case "deny":
    case "failure":
      return "failed";
    default:
      return "pending";
  }
}

/** Order ID unik ≤ 50 karakter, mis. MTK-P-lx3k2f-8a1c. */
export function newOrderId(kind: "plan" | "addon" | "bundle") {
  const rand = Math.random().toString(36).slice(2, 6);
  return `MTK-${kind[0].toUpperCase()}-${Date.now().toString(36)}-${rand}`;
}
