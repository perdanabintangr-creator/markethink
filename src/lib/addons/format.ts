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
export function quotaText(s: AddonStatusLite) {
  if (s.isAdmin) return "Admin · tanpa batas";
  const parts: string[] = [];
  if (s.isPromax) parts.push(`Gratis Promax: sisa ${s.promaxRemaining}/${s.promaxQuota} bulan ini`);
  if (s.paidUntil) parts.push(`Add-on aktif s/d ${dateID(s.paidUntil)} · sisa ${s.paidRemaining}/${s.quota} bulan ini`);
  if (s.trialRemaining > 0) parts.push(`Coba gratis ${s.trialRemaining}×`);
  if (!parts.length) return "Belum aktif";
  return parts.join(" · ");
}

/** Batas perbaikan (revisi) gratis per hasil Tools Pro — revisi tidak memotong kuota add-on. */
export const MAX_REVISIONS = 3;
