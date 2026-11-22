/**
 * Aturan jatah (Fase 1) yang aman dipakai di server & browser: konversi biaya → kredit, waktu reset, teks penolakan.
 */
/** Kurs untuk mengubah biaya AI (USD) → kredit. Diperbarui 22 Nov 2026 (kurs riil ±Rp18.270); bisa diganti lewat env IDR_PER_USD. */
export const IDR_PER_USD = Number(process.env.IDR_PER_USD) || 18_300;
export const IDR_PER_CREDIT = 100;
/** Potongan minimal per jawaban yang berhasil (±Rp25), juga untuk model gratis — menjaga batas harian tetap berarti. */
export const MIN_CREDITS = 0.25;

/** Biaya AI (USD) → kredit pecahan (dibulatkan ke atas per 0,01; minimal 0,25). */
export function creditsForUsd(usd: number) {
  const raw = (Math.max(0, usd) * IDR_PER_USD) / IDR_PER_CREDIT;
  return Math.max(MIN_CREDITS, Math.ceil(raw * 100 - 1e-9) / 100);
}

/** Alasan jatah ditolak. */
export type QuotaBlock = "daily" | "weekly" | "director" | "no_plan";

const WIB_MS = 7 * 3_600_000;

/** Tengah malam WIB berikutnya. */
export function nextDayResetWib(now = new Date()) {
  const wib = new Date(now.getTime() + WIB_MS);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + 1) - WIB_MS);
}

/** Senin 00.00 WIB berikutnya. */
export function nextWeekResetWib(now = new Date()) {
  const wib = new Date(now.getTime() + WIB_MS);
  const daysToMonday = ((8 - wib.getUTCDay()) % 7) || 7;
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + daysToMonday) - WIB_MS);
}

/** Awal minggu (Senin 00.00 WIB) yang sedang berjalan. */
export function weekStartWib(now = new Date()) {
  return new Date(nextWeekResetWib(now).getTime() - 7 * 86_400_000);
}

/** Pesan untuk pelanggan saat jatah menolak permintaan. */
export function quotaMessage(reason: QuotaBlock | null | undefined, en: boolean) {
  switch (reason) {
    case "daily":
      return en
        ? "Today's allowance is used up. It refills tonight at 00:00 WIB — your weekly allowance is still there."
        : "Jatah hari ini sudah habis. Terisi lagi malam ini pukul 00.00 WIB — jatah mingguanmu masih ada.";
    case "director":
      return en
        ? "The Director brain can use up to half of your weekly allowance, and that portion is used up. Use the Head brain, or wait until Monday 00:00 WIB."
        : "Otak Director maksimal memakai separuh jatah mingguan, dan porsinya sudah habis. Pakai otak Head, atau tunggu Senin pukul 00.00 WIB.";
    case "weekly":
    case "no_plan":
    default:
      return en
        ? "This week's allowance is used up. It refills on Monday at 00:00 WIB, or upgrade for a bigger allowance."
        : "Jatah minggu ini sudah habis. Terisi lagi Senin pukul 00.00 WIB, atau upgrade paket untuk jatah lebih besar.";
  }
}
