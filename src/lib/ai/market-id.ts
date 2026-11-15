/**
 * Tim Otak tahap 2 — Pengetahuan Pasar Indonesia.
 * Momen marketing lokal yang akan datang + kisaran biaya iklan Meta Indonesia (bersumber, ditandai perkiraan).
 * Disisipkan ke konteks giliran chat (bukan system prompt) agar system prompt tetap ter-cache.
 * Tanggal hari besar keagamaan = perkiraan sampai ditetapkan pemerintah; perbarui daftar VARIABLE tiap tahun.
 */

export interface MarketMoment {
  name: string;
  /** YYYY-MM-DD */
  start: string;
  end?: string;
  tip: string;
  approx?: boolean;
}

/** Momen tanggal tetap (berulang tiap tahun): [bulan, tanggal, nama, tips]. */
const FIXED: [number, number, string, string][] = [
  [1, 1, "Tahun Baru", "resolusi, 'new year new me', promo awal tahun"],
  [2, 14, "Valentine", "hadiah pasangan & sahabat, paket berdua"],
  [3, 8, "Hari Perempuan Internasional", "cerita pelanggan/karyawan perempuan, kolaborasi"],
  [4, 21, "Hari Kartini", "konten perempuan inspiratif, promo bertema kebaya/budaya"],
  [8, 17, "HUT Kemerdekaan RI (Agustusan)", "promo 17-an, lomba, nuansa merah putih sepanjang 1–17 Agustus"],
  [9, 9, "Tanggal kembar 9.9", "flash sale marketplace"],
  [10, 10, "Tanggal kembar 10.10", "flash sale marketplace"],
  [10, 28, "Sumpah Pemuda", "konten anak muda & produk lokal"],
  [11, 11, "Tanggal kembar 11.11", "salah satu puncak belanja online; siapkan stok & iklan seminggu sebelumnya"],
  [12, 12, "Harbolnas 12.12", "Hari Belanja Online Nasional; puncak belanja akhir tahun"],
  [12, 22, "Hari Ibu", "hadiah untuk ibu, cerita keluarga"],
  [12, 25, "Natal & libur akhir tahun", "hampers, promo liburan; libur sekolah Desember"],
];

/** Momen yang tanggalnya berubah tiap tahun (perkiraan). */
const VARIABLE: MarketMoment[] = [
  { name: "Black Friday", start: "2026-11-27", tip: "makin dikenal pembeli online kota besar; cocok untuk diskon terbatas" },
  { name: "Imlek", start: "2027-02-06", tip: "angpao, warna merah-emas, hampers, promo keluarga" },
  {
    name: "Ramadan",
    start: "2027-02-08",
    end: "2027-03-09",
    approx: true,
    tip: "jam ramai bergeser ke sahur & menjelang buka; konten ngabuburit, bukber, THR, hampers Lebaran. Mulai kampanye 2–3 minggu sebelumnya",
  },
  { name: "Idul Fitri (Lebaran)", start: "2027-03-10", approx: true, tip: "puncak belanja tahunan sebelum Lebaran; mudik & libur panjang, toko fisik bisa sepi saat libur" },
  { name: "Idul Adha", start: "2027-05-17", approx: true, tip: "momen berbagi & kurban; promo keluarga" },
  { name: "Tahun ajaran baru", start: "2027-07-12", approx: true, tip: "perlengkapan sekolah/kuliah, mahasiswa baru di kota kampus" },
  { name: "Black Friday", start: "2027-11-26", tip: "diskon terbatas" },
];

/** Kisaran biaya iklan Meta (Facebook/Instagram) Indonesia 2026 — dari blog agency, bervariasi tiap minggu. */
export const META_AD_BENCHMARK_ID = {
  cpm: "±Rp23.000–35.000 per 1.000 tayangan",
  cpc: "±Rp1.500 per klik",
  cpa: "±Rp25.000–150.000 per pembelian (sangat bergantung produk & harga)",
  source: "Olakses (data iklan audiens Indonesia, Feb–Sep 2026)",
  updated: "2026-09",
} as const;

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Tanggal "hari ini" di WIB sebagai UTC tengah malam (agar selisih hari stabil). */
export function wibDate(now: Date) {
  const wib = new Date(now.getTime() + 7 * 3_600_000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
}

const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const fmt = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

/** Momen yang dimulai (atau sedang berlangsung) dalam `days` hari ke depan, urut tanggal. */
export function upcomingMoments(now: Date, days = 75): (MarketMoment & { inDays: number; ongoing: boolean })[] {
  const today = wibDate(now);
  const limit = today.getTime() + days * DAY;
  const year = today.getUTCFullYear();
  const fixed: MarketMoment[] = [year, year + 1].flatMap((y) =>
    FIXED.map(([m, d, name, tip]) => ({
      name,
      start: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      tip,
    })),
  );
  return [...fixed, ...VARIABLE]
    .map((m) => {
      const start = parse(m.start).getTime();
      const end = m.end ? parse(m.end).getTime() : start;
      return { m, start, inDays: Math.round((start - today.getTime()) / DAY), ongoing: start <= today.getTime() && end >= today.getTime() };
    })
    .filter((x) => (x.start >= today.getTime() && x.start <= limit) || x.ongoing)
    .sort((a, b) => a.start - b.start)
    .map((x) => ({ ...x.m, inDays: x.inDays, ongoing: x.ongoing }));
}

/** Posisi siklus gajian (pola umum karyawan: gajian ±25 s/d akhir bulan, "tanggal tua" ±15–24). */
export function paydayPhase(now: Date) {
  const d = wibDate(now).getUTCDate();
  if (d >= 25 || d <= 3) return "masa gajian (daya beli sedang tinggi)";
  if (d >= 15) return "tanggal tua (pembeli lebih hemat; promo hemat/cicilan lebih efektif)";
  return "awal–pertengahan bulan (daya beli normal)";
}

/** Blok konteks untuk AI: momen terdekat, siklus gajian, dan kisaran biaya iklan Meta Indonesia. */
export function marketContext(now: Date, days = 75) {
  const today = wibDate(now);
  const moments = upcomingMoments(now, days)
    .map((m) => {
      const when = m.ongoing
        ? `sedang berlangsung s/d ${fmt(parse(m.end ?? m.start))}`
        : `${fmt(parse(m.start))}${m.end ? `–${fmt(parse(m.end))}` : ""} (${m.inDays === 0 ? "hari ini" : `${m.inDays} hari lagi`})`;
      return `- ${m.name}: ${when}${m.approx ? " [perkiraan, menunggu penetapan resmi]" : ""} — ${m.tip}`;
    })
    .join("\n");
  const b = META_AD_BENCHMARK_ID;
  return `[Konteks sistem] Pengetahuan Pasar Indonesia (hari ini ${fmt(today)}, WIB). Pakai bila relevan dengan permintaan (rencana, kalender, promo, iklan); jangan dipaksakan.
Momen marketing terdekat:
${moments || "- (tidak ada momen besar dalam waktu dekat)"}
Siklus gajian sekarang: ${paydayPhase(now)}. Tanggal kembar tiap bulan (mis. 1.1–12.12) biasanya ada flash sale marketplace.
Kisaran biaya iklan Meta (FB/IG) Indonesia — perkiraan, berubah tiap minggu, tulis sebagai "(perkiraan)" dan sarankan cek Ads Manager: CPM ${b.cpm}, CPC ${b.cpc}, biaya per pembelian ${b.cpa}. Sumber: ${b.source}.`;
}
