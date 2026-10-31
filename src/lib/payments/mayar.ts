import "server-only";
import { createHash, timingSafeEqual } from "crypto";

/**
 * Mayar Headless API: "single payment request" → link bayar Mayar (QRIS, e-wallet, VA, kartu).
 * Env: MAYAR_API_KEY (wajib), MAYAR_IS_PRODUCTION="true" untuk mode live (default sandbox api.mayar.club),
 * MAYAR_WEBHOOK_TOKEN (opsional, token callback dari dashboard Mayar → dicek di header `x-callback-token`).
 *
 * Bentuk respons Mayar berbeda antar versi API (v1 vs v2; `data` objek atau array; `link`/`paymentLink`),
 * jadi pembacaannya dibuat longgar. Status selalu dicek ulang ke API sebelum paket diaktifkan.
 */
const BASE = { sandbox: "https://api.mayar.club", production: "https://api.mayar.id" };

const apiKey = () => process.env.MAYAR_API_KEY?.trim() ?? "";
export const mayarMode = (flag = process.env.MAYAR_IS_PRODUCTION): "sandbox" | "production" => (flag === "true" ? "production" : "sandbox");
export const mayarEnabled = () => Boolean(apiKey());

class MayarHttpError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`mayar ${status} [mode ${mayarMode()}]: ${body.slice(0, 300)}`);
  }
}

async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE[mayarMode()]}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey()}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new MayarHttpError(res.status, text);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Coba endpoint v1 dulu (paling banyak dipakai), lalu v2 bila v1 tidak dikenal (404/405). */
async function callEither(method: "GET" | "POST", v1: string, v2: string, body?: unknown) {
  try {
    return await call(method, v1, body);
  } catch (err) {
    if (err instanceof MayarHttpError && (err.status === 404 || err.status === 405)) return call(method, v2, body);
    throw err;
  }
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const firstData = (json: unknown): Obj | null => {
  const d = isObj(json) ? json.data : null;
  if (Array.isArray(d)) return isObj(d[0]) ? d[0] : null;
  return isObj(d) ? d : null;
};
const str = (...vals: unknown[]) => {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
};

/** Ambil id & link bayar dari respons "create" (v1/v2). */
export function parseCreated(json: unknown): { id: string; link: string; transactionId: string | null } | null {
  const d = firstData(json);
  if (!d) return null;
  const id = str(d.id, d.paymentId, d.payment_id);
  const link = str(d.link, d.paymentLink, d.paymentUrl, d.url);
  if (!id || !link || !/^https:\/\//.test(link)) return null;
  return { id, link, transactionId: str(d.transactionId, d.transaction_id) };
}

export interface MayarPaymentParams {
  orderId: string;
  amount: number;
  item: { name: string };
  customer: { name?: string | null; email?: string | null };
  redirectUrl: string;
}

/** Buat permintaan bayar → URL halaman bayar Mayar. Nomor order ikut di deskripsi agar mudah dicocokkan. */
export async function createMayarPayment(p: MayarPaymentParams) {
  const body: Obj = {
    name: (p.customer.name || p.customer.email || "Pelanggan").slice(0, 80),
    email: p.customer.email ?? undefined,
    amount: p.amount,
    redirectUrl: p.redirectUrl,
    description: `${p.item.name} · ${p.orderId}`.slice(0, 250),
    expiredAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
  };
  let json: unknown;
  try {
    json = await callEither("POST", "/hl/v1/payment/create", "/hl/v2/payments/create", body);
  } catch (err) {
    // Nomor HP belum kita simpan; bila Mayar mewajibkannya, kirim ulang dengan nomor netral (pembeli tetap bisa mengisi di halaman bayar).
    if (!(err instanceof MayarHttpError && err.status === 400 && /mobile|phone/i.test(err.body))) throw err;
    json = await callEither("POST", "/hl/v1/payment/create", "/hl/v2/payments/create", { ...body, mobile: "080000000000" });
  }
  const created = parseCreated(json);
  if (!created) throw new Error(`mayar: respons tanpa link bayar ${JSON.stringify(json).slice(0, 300)}`);
  return { redirectUrl: created.link, reference: created.id };
}

/** Status Mayar → status Marqthink. */
export function mayarStatusOf(raw: unknown): "paid" | "pending" | "failed" | "expired" | "canceled" {
  const s = typeof raw === "string" ? raw.toLowerCase() : raw === true ? "paid" : "";
  if (["paid", "success", "settled", "settlement", "completed", "complete"].includes(s)) return "paid";
  if (s === "expired") return "expired";
  if (s.startsWith("cancel") || s === "closed") return "canceled";
  if (s === "failed" || s === "failure") return "failed";
  return "pending";
}

export interface MayarStatus {
  status: "paid" | "pending" | "failed" | "expired" | "canceled";
  amount: number | null;
  paymentType: string | null;
  notFound: boolean;
  raw: unknown;
}

/** Baca status dari detail permintaan bayar: status utama, atau transaksi yang sudah lunas di dalamnya. */
export function parseDetail(json: unknown): MayarStatus {
  const d = firstData(json);
  if (!d) return { status: "pending", amount: null, paymentType: null, notFound: true, raw: json };
  const txs = Array.isArray(d.transactions) ? d.transactions.filter(isObj) : [];
  const paidTx = txs.find((t) => mayarStatusOf(t.status) === "paid");
  const status = paidTx ? "paid" : mayarStatusOf(d.status ?? d.transactionStatus);
  const amountRaw = d.amount ?? paidTx?.amount;
  const amount = amountRaw !== undefined && amountRaw !== null && amountRaw !== "" ? Math.round(Number(amountRaw)) : null;
  return {
    status,
    amount: Number.isFinite(amount) ? amount : null,
    paymentType: str(paidTx?.paymentMethod, paidTx?.paymentType, d.paymentMethod, d.paymentType),
    notFound: false,
    raw: json,
  };
}

/** Status permintaan bayar langsung dari Mayar (sumber kebenaran). */
export async function getMayarStatus(paymentId: string): Promise<MayarStatus> {
  const id = encodeURIComponent(paymentId);
  try {
    return parseDetail(await callEither("GET", `/hl/v1/payment/${id}`, `/hl/v2/payments/${id}`));
  } catch (err) {
    if (err instanceof MayarHttpError && err.status === 404) return { status: "pending", amount: null, paymentType: null, notFound: true, raw: null };
    throw err;
  }
}

/** Cek token webhook (timing-safe). Tanpa MAYAR_WEBHOOK_TOKEN → `null` (tidak dicek, status tetap diverifikasi ke API). */
export function verifyMayarToken(received: string | null, expected = process.env.MAYAR_WEBHOOK_TOKEN?.trim() ?? ""): boolean | null {
  if (!expected) return null;
  if (!received) return false;
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const ORDER_RE = /MTK-[PAB]-[a-z0-9]+-[a-z0-9]{2,8}/i;

/** Petunjuk dari isi webhook untuk mencari tagihan kita: nomor order (dari deskripsi) & id-id Mayar. */
export function webhookHints(body: unknown) {
  const d = isObj(body) && isObj(body.data) ? body.data : isObj(body) ? body : {};
  const event = isObj(body) ? (isObj(body.event) ? str(body.event.received) : str(body.event, body.type)) : null;
  const ids = [d.id, d.paymentId, d.paymentLinkId, d.productId, d.transactionId, d.invoiceId].filter(
    (v): v is string => typeof v === "string" && v.length > 3,
  );
  const orderId = JSON.stringify(body ?? "").match(ORDER_RE)?.[0] ?? null;
  const amount = d.amount !== undefined ? Math.round(Number(d.amount)) : null;
  return {
    event,
    ids: [...new Set(ids)],
    orderId,
    amount: Number.isFinite(amount) ? amount : null,
    paidFlag: d.status === true || mayarStatusOf(d.status) === "paid",
  };
}
