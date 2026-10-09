/** Format & label untuk back office (aman dipakai di server maupun client). */

export const PAYMENT_METHODS = ["Transfer bank", "QRIS", "E-wallet", "Kartu kredit", "Tunai", "Lainnya"] as const;

export const SALE_KIND: Record<string, string> = {
  new: "Baru",
  renewal: "Perpanjang",
  upgrade: "Upgrade",
  downgrade: "Downgrade",
};

/** "3 bulan 12 hari" — lama sejak tanggal tertentu, bahasa sehari-hari. */
export function durationSince(from: string | null | undefined, to: Date = new Date()) {
  if (!from) return "-";
  const start = new Date(from);
  const days = Math.max(0, Math.floor((to.getTime() - start.getTime()) / 86_400_000));
  if (days < 1) return "hari ini";
  if (days < 31) return `${days} hari`;
  const months = Math.floor(days / 30.44);
  if (months < 12) {
    const rest = Math.round(days - months * 30.44);
    return rest > 0 ? `${months} bln ${rest} hr` : `${months} bln`;
  }
  const years = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${years} th ${m} bln` : `${years} th`;
}

/** Sisa hari sampai tanggal (negatif = sudah lewat). */
export function daysUntil(date: string | null | undefined) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

export const rupiah = (v: number | string | null | undefined) => `Rp${new Intl.NumberFormat("id-ID").format(Math.round(Number(v ?? 0)))}`;
export const dateID = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }) : "-";
