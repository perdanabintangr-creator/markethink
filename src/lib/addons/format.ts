/** Format & tipe Tools Pro — aman dipakai di server maupun client (bukan modul "use client"). */

export interface ToolFileLite {
  id: string;
  name: string;
  kind: "pptx" | "xlsx";
  label: string;
}

/** Status kuota add-on yang aman dikirim ke client. */
export interface AddonStatusLite {
  id: string;
  name: string;
  price: number;
  quota: number;
  promaxQuota: number;
  trialQuota: number;
  isAdmin: boolean;
  isPromax: boolean;
  isFree: boolean;
  paidUntil: string | null;
  paidRemaining: number;
  promaxRemaining: number;
  trialRemaining: number;
  hasAccess: boolean;
  nextSource: "admin" | "promax" | "paid" | "trial" | null;
}

export const rupiah = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "-" : `Rp${new Intl.NumberFormat("id-ID").format(Math.round(n))}`;
export const numID = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined || Number.isNaN(n) ? "-" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(n);
export const dateID = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }) : "-";

/** Ringkasan status kuota add-on dalam satu kalimat. */
/** Hak pakai Tools Pro (paket all-in-1, memakai kredit bulanan). Aman dikirim ke client. */
export interface ToolAccessLite {
  allowed: boolean;
  agent: boolean;
  isAdmin: boolean;
  isFree: boolean;
  planId: string;
  remaining: number;
  monthLimit: number;
}

/** Perkiraan kredit per hasil Tools Pro per otak (dipotong di awal, lalu disesuaikan ke biaya nyata). 1 kredit ≈ Rp100 modal. */
export const TOOL_CREDIT_ESTIMATE = { senior: 50, associate: 120, director: 300 } as const;
/** Revisi tanpa riset ulang: ±60% dari membuat baru. */
export const revisionEstimate = (tier: keyof typeof TOOL_CREDIT_ESTIMATE) => Math.ceil(TOOL_CREDIT_ESTIMATE[tier] * 0.6);

/** Kuota ditampilkan ke user sebagai persen (angka kredit tidak ditampilkan). */
export const UNLIMITED_CREDITS = 1_000_000;

/** Persen kuota bulanan yang tersisa (0–100). */
export function quotaLeftPct(remaining: number, monthLimit: number) {
  if (monthLimit >= UNLIMITED_CREDITS) return 100;
  if (monthLimit <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((remaining / monthLimit) * 100)));
}

/** Perkiraan bagian kuota bulanan untuk satu aksi, mis. "±20%" atau "<1%". Null bila tanpa batas. */
export function quotaShare(estimate: number, monthLimit: number) {
  if (monthLimit >= UNLIMITED_CREDITS || monthLimit <= 0) return null;
  const pct = (estimate / monthLimit) * 100;
  return pct < 1 ? "<1%" : `±${Math.round(pct)}%`;
}

export function creditText(a: ToolAccessLite) {
  if (a.isAdmin) return "Admin · tanpa batas";
  if (!a.allowed) return a.isFree ? "🔒 Terkunci di paket Free" : "🔒 Tidak termasuk paket kamu";
  return `Kuota bulan ini tersisa ${quotaLeftPct(a.remaining, a.monthLimit)}%`;
}

export function quotaText(s: AddonStatusLite) {
  if (s.isAdmin) return "Admin · tanpa batas";
  const parts: string[] = [];
  if (s.isPromax) parts.push(`Gratis Promax: sisa ${s.promaxRemaining}/${s.promaxQuota} bulan ini`);
  if (s.paidUntil) parts.push(`Add-on aktif s/d ${dateID(s.paidUntil)} · sisa ${s.paidRemaining}/${s.quota} bulan ini`);
  if (s.trialRemaining > 0) parts.push(`Coba gratis ${s.trialRemaining}×`);
  if (!parts.length) return s.isFree ? "🔒 Terkunci di paket Free" : "Belum aktif";
  return parts.join(" · ");
}

/** Batas perbaikan (revisi) gratis per hasil Tools Pro — revisi tidak memotong kuota add-on. */
export const MAX_REVISIONS = 5;

/** Blok yang ditulis AI di chat "Bahas di Chat" untuk memicu pembaruan hasil di panel kanan. */
export const UPDATE_RESULT_BLOCK = /\[\[PERBARUI_HASIL\]\]([\s\S]*?)(?:\[\[\/PERBARUI_HASIL\]\]|$)/;
