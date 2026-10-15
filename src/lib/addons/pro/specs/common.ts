import { z } from "zod";

/** Teks hasil AI tanpa batas keras (agar tidak gagal validasi); panjang dipandu lewat deskripsi. */
export const t = (max: number) => z.string().describe(`ringkas, maks ±${max} karakter`);
export const priority = z.enum(["tinggi", "sedang", "rendah"]);
export const sources = z.array(z.object({ title: z.string(), url: z.string() })).optional();

export const PLATFORM_OPTIONS: [string, string][] = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
  ["youtube", "YouTube Shorts"],
  ["linkedin", "LinkedIn"],
  ["x", "X / Twitter"],
];

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Pilihan bulan (bulan ini + 2 berikutnya) dengan nilai stabil "YYYY-MM". */
export function monthOptions(count = 3, now = new Date()) {
  const d = new Date(now.getTime() + 7 * 3_600_000);
  const out: [string, string][] = [];
  for (let i = 0; i < count; i++) {
    const y = d.getUTCFullYear() + Math.floor((d.getUTCMonth() + i) / 12);
    const m = (d.getUTCMonth() + i) % 12;
    out.push([`${y}-${String(m + 1).padStart(2, "0")}`, `${MONTHS[m]} ${y}`]);
  }
  return out;
}

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
};
