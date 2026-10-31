import "server-only";
import { createHash } from "crypto";

/**
 * Duitku POP (halaman bayar QRIS, e-wallet, VA). Format mengikuti library resmi duitkupg/duitku-php.
 * Env: DUITKU_MERCHANT_CODE + DUITKU_API_KEY (wajib), DUITKU_IS_PRODUCTION="true" untuk mode live (default sandbox).
 */
const POP = { sandbox: "https://api-sandbox.duitku.com", production: "https://api-prod.duitku.com" };

const merchantCode = () => process.env.DUITKU_MERCHANT_CODE?.trim() ?? "";
const apiKey = () => process.env.DUITKU_API_KEY?.trim() ?? "";
export const duitkuMode = (flag = process.env.DUITKU_IS_PRODUCTION): "sandbox" | "production" =>
  flag === "true" ? "production" : "sandbox";
export const duitkuEnabled = () => Boolean(merchantCode() && apiKey());

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const md5 = (s: string) => createHash("md5").update(s).digest("hex");

async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${POP[duitkuMode()]}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {}
  if (!res.ok) throw new Error(`duitku ${res.status} [mode ${duitkuMode()}]: ${text.slice(0, 300)}`);
  return data as T;
}

export interface DuitkuInvoiceParams {
  orderId: string;
  amount: number;
  item: { name: string };
  customer: { name?: string | null; email?: string | null };
  callbackUrl: string;
  returnUrl: string;
}

/** Buat tagihan → URL halaman bayar Duitku. Tanda tangan header: SHA256(merchantCode + timestamp + apiKey). */
export async function createDuitkuInvoice(p: DuitkuInvoiceParams) {
  const timestamp = String(Date.now());
  const name = (p.customer.name || p.customer.email || "Pelanggan").slice(0, 50);
  const res = await post<{ paymentUrl?: string; reference?: string; statusCode?: string; statusMessage?: string; Message?: string }>(
    "/api/merchant/createInvoice",
    {
      paymentAmount: p.amount,
      merchantOrderId: p.orderId,
      productDetails: p.item.name.slice(0, 255),
      email: p.customer.email ?? undefined,
      customerVaName: name,
      itemDetails: [{ name: p.item.name.slice(0, 255), price: p.amount, quantity: 1 }],
      customerDetail: { firstName: name, email: p.customer.email ?? undefined },
      callbackUrl: p.callbackUrl,
      returnUrl: p.returnUrl,
      expiryPeriod: 60 * 24,
    },
    {
      "x-duitku-signature": sha256(`${merchantCode()}${timestamp}${apiKey()}`),
      "x-duitku-timestamp": timestamp,
      "x-duitku-merchantcode": merchantCode(),
    },
  );
  if (!res.paymentUrl) throw new Error(`duitku: ${res.statusMessage ?? res.Message ?? "tanpa paymentUrl"}`);
  return { redirectUrl: res.paymentUrl, reference: res.reference ?? null };
}

export interface DuitkuStatus {
  merchantOrderId?: string;
  reference?: string;
  amount?: string | number;
  fee?: string | number;
  statusCode?: string;
  statusMessage?: string;
}

/** Status transaksi langsung dari Duitku (sumber kebenaran). Tanda tangan: MD5(merchantCode + orderId + apiKey). */
export function getDuitkuStatus(orderId: string) {
  return post<DuitkuStatus>("/api/merchant/transactionStatus", {
    merchantCode: merchantCode(),
    merchantOrderId: orderId,
    signature: md5(`${merchantCode()}${orderId}${apiKey()}`),
  });
}

/** Status Duitku → status Marqthink. 00 = lunas, 01 = menunggu, 02 = gagal/dibatalkan. */
export function duitkuStatusOf(code: string | undefined): "paid" | "pending" | "failed" {
  if (code === "00") return "paid";
  if (code === "02") return "failed";
  return "pending";
}

export interface DuitkuCallback {
  merchantCode?: string;
  amount?: string;
  merchantOrderId?: string;
  resultCode?: string;
  paymentCode?: string;
  reference?: string;
  signature?: string;
}

/** Tanda tangan callback: MD5(merchantCode + amount + merchantOrderId + apiKey). */
export function validDuitkuCallback(n: DuitkuCallback, key = apiKey(), code = merchantCode()) {
  if (!n.signature || !n.merchantOrderId || !n.amount || !key || n.merchantCode !== code) return false;
  return md5(`${n.merchantCode}${n.amount}${n.merchantOrderId}${key}`) === n.signature.toLowerCase();
}
