import "server-only";
import { clip, fileSlug } from "../../runtime";
import { atLeast, makeRunner, type ProDef } from "../kit";
import { monthLabel } from "../specs/common";
import { CHECK_PHASES, MARGIN_LABEL, PROMO_PLATFORMS, SCALE_LABEL, calcMargin, platformFeeRp, promoForm, promoOutput, type PromoOutput } from "../specs/promo";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(toDate(s).getTime() + n * 86_400_000));
const diffDays = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
const dayName = (s: string) => DAYS[toDate(s).getUTCDay()] ?? "";
const valid = (s: string) => ISO.test(s) && !Number.isNaN(toDate(s).getTime()) && iso(toDate(s)) === s;

/** Daftar bulan "YYYY-MM" dalam periode rencana. */
function periodMonths(start: string, count: number) {
  const [y, m] = start.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const mm = (m - 1 + i) % 12;
    return `${y + Math.floor((m - 1 + i) / 12)}-${pad(mm + 1)}`;
  });
}
const lastDay = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
};

function period(input: Record<string, unknown>) {
  const start = /^\d{4}-\d{2}$/.test(String(input.start_month)) ? String(input.start_month) : new Date().toISOString().slice(0, 7);
  const count = Math.min(3, Math.max(1, Number(input.months) || 2));
  const months = periodMonths(start, count);
  return { months, from: `${months[0]}-01`, to: lastDay(months[months.length - 1]) };
}

/** Black Friday = Jumat setelah Kamis ke-4 bulan November. */
function blackFriday(year: number) {
  const first = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const firstThu = 1 + ((4 - first + 7) % 7);
  return `${year}-11-${pad(firstThu + 21 + 1)}`;
}

/** Momen belanja yang tanggalnya bergeser tiap tahun (perkiraan; tunggu penetapan resmi untuk hari besar keagamaan). */
const MOVING: Record<string, string> = {
  "2027-02-06": "Imlek",
  "2027-02-08": "Perkiraan awal Ramadan (cek penetapan pemerintah)",
  "2027-03-10": "Perkiraan Idulfitri (cek penetapan pemerintah); THR cair ±H-14 s/d H-7",
  "2027-05-17": "Perkiraan Iduladha",
  "2028-01-26": "Imlek",
  "2028-01-28": "Perkiraan awal Ramadan (cek penetapan pemerintah)",
  "2028-02-27": "Perkiraan Idulfitri (cek penetapan pemerintah); THR cair ±H-14 s/d H-7",
  "2026-05-27": "Perkiraan Iduladha",
};
const FIXED: Record<string, string> = {
  "01-01": "Tahun Baru",
  "02-14": "Valentine",
  "03-08": "Hari Perempuan Internasional",
  "04-21": "Hari Kartini",
  "07-15": "Perkiraan tahun ajaran baru (back to school, pertengahan Juli)",
  "08-17": "HUT RI",
  "09-04": "Hari Pelanggan Nasional",
  "12-22": "Hari Ibu",
  "12-25": "Natal",
  "12-31": "Malam tahun baru / akhir tahun",
};

/** Tanggal penting periode ini yang sudah dihitung sistem (dipakai di prompt). */
function keyDates(months: string[]) {
  const out: { date: string; label: string }[] = [];
  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    out.push({ date: `${ym}-${pad(m)}`, label: `${m}.${m} (tanggal kembar)${m === 12 ? " = Harbolnas" : ""}` });
    out.push({ date: `${ym}-25`, label: "Payday tanggal 25 (gajian; puncak 25-28)" });
    out.push({ date: `${ym}-01`, label: "Awal bulan (gajian sebagian pekerja/ASN)" });
    if (m === 11) out.push({ date: blackFriday(y), label: "Black Friday" });
    for (const [md, label] of Object.entries(FIXED)) if (md.startsWith(pad(m))) out.push({ date: `${y}-${md}`, label });
    for (const [d, label] of Object.entries(MOVING)) if (d.startsWith(ym)) out.push({ date: d, label });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const GOAL: Record<string, string> = {
  omzet: "kejar omzet (GMV). Fokus konsentrasi budget di event besar, AOV naik lewat voucher min. belanja & bundling.",
  peringkat:
    "naik peringkat toko & produk. Prioritaskan volume order & ulasan di 1-3 produk utama (rating ≥4,8, chat response ≥90%, pengiriman tepat waktu), ikut semua campaign platform, flash sale rutin untuk menjaga velocity.",
  cuci_stok:
    "cuci stok. Produk lambat dijadikan bundling/gift with purchase dengan produk laris, diskon bertingkat makin dekat akhir periode, tetap tolak harga di bawah HPP + biaya platform kecuali disetujui sebagai rugi terencana (tandai jelas).",
  pembeli_baru:
    "akuisisi pembeli baru. Voucher pembeli baru & voucher follower, produk entry/ukuran trial sebagai traffic driver, affiliate/KOL, lalu dorong pembelian kedua lewat voucher repeat order.",
};

export const promoDef: ProDef<typeof promoOutput> = {
  tool: "promo",
  addon: "jualan_kit",
  form: promoForm,
  output: promoOutput,
  maxOutputTokens: 15000,
  role: `Kamu E-commerce Manager senior yang memegang toko Shopee Mall dan TikTok Shop dengan omzet miliaran rupiah per bulan
(beauty, F&B kemasan, fashion, home living). Kamu sudah memimpin puluhan campaign 9.9, 10.10, 11.11, 12.12/Harbolnas, payday, dan Ramadan.
Kalender promomu dipakai langsung oleh admin toko, tim live, gudang, dan tim iklan — setiap angka diskon sudah dihitung marginnya.`,
  rules: (input) => {
    const p = period(input);
    const platforms = (input.platforms as unknown as string[]).map((v) => PROMO_PLATFORMS.find(([k]) => k === v)?.[1] ?? v).join(", ");
    const dates = keyDates(p.months)
      .map((d) => `  - ${d.date} (${dayName(d.date)}): ${d.label}`)
      .join("\n");
    return `- Periode rencana: ${p.from} s/d ${p.to} (${p.months.map(monthLabel).join(", ")}). Platform: ${platforms}. SEMUA tanggal campaign di dalam periode ini, format YYYY-MM-DD.
- Tujuan: ${GOAL[String(input.goal)] ?? GOAL.omzet}
- Tanggal penting yang SUDAH DICEK sistem (pakai tanggal & harinya persis; tanggal kembar selalu tanggal = nomor bulan):
${dates}

STRUKTUR KALENDER
- Wajib ada: setiap tanggal kembar di periode ini (scale "besar"; Desember = 12.12 Harbolnas), payday 25 tiap bulan (scale "sedang"), dan flash sale
  mingguan (scale "rutin") di hari tetap yang tidak bentrok dengan event besar (mis. tiap Jumat 12.00 & 20.00). Tambahkan momen lain hanya bila relevan dengan produk.
- Tiap event besar punya 3 fase: pemanasan H-7 s/d H-1 (teaser, klaim voucher, ajak add to cart/wishlist, live pemanasan), puncak hari-H
  (jam ramai 00.00-02.00, 12.00-13.00, 19.00-23.59), dan perpanjangan H+1 s/d H+2 untuk stok sisa. Tulis rentang start-end sesuai fase puncak + perpanjangan.
- Disiplin harga: diskon terdalam HANYA di event besar; payday lebih ringan; flash sale mingguan hanya 1-2 produk dengan kuota terbatas.
  Di luar event harga kembali normal agar harga coret tetap kredibel. JANGAN menyarankan menaikkan harga sebelum diskon (melanggar kebijakan harga marketplace).
- Pembagian peran produk: 1 produk traffic driver (diskon paling menarik, margin boleh tipis 0-10%), produk profit driver dijual lewat bundling/ukuran besar
  (margin ≥15%). Jangan mendiskon semua SKU sekaligus.

MEKANISME & VOUCHER
- Kombinasikan: diskon produk, voucher toko dengan min. belanja 1,2-1,5× AOV (untuk menaikkan AOV), voucher follower, voucher eksklusif live,
  bundling/paket hemat, gift with purchase, flash sale slot jam tertentu. Sebut angka pasti (min. belanja, potongan, kuota).
- Kuota × potongan = subsidi maksimal; total subsidi per bulan tidak boleh melebihi kemampuan user. Sebut perkiraan subsidi di mechanism event besar.
- Pendaftaran campaign resmi platform biasanya dibuka 2-4 minggu sebelum event — masukkan ke prep dan checklist H-14.

HITUNG MARGIN (margins)
- Satu baris per produk utama untuk skenario terberatnya (event besar), tambah skenario lain bila produknya ikut beberapa mekanisme berbeda. Maks 10 baris.
- HPP ambil dari data user; bila user hanya memberi margin %, turunkan HPP-nya. Bila HPP tidak ada sama sekali, asumsikan wajar dan tulis "HPP perkiraan" di note.
- platform_fee_pct = perkiraan total potongan platform untuk toko Mall/official yang ikut program gratis ongkir & cashback, umumnya 12-25%
  (biaya admin kategori + biaya layanan program + biaya transaksi). Tulis di note bahwa tarif wajib dicek di Seller Centre karena sering berubah.
- other_cost = subsidi voucher toko per unit (potongan ÷ perkiraan unit per order) + alokasi iklan per unit bila relevan; null bila tidak dihitung.
- Rumus (sistem akan menghitung ulang): harga promo = harga × (1 - diskon%); margin = harga promo - HPP - (harga promo × biaya platform%) - biaya lain.
  Status: rugi < 0, tipis < 10%, aman ≥ 10%. Untuk baris rugi/tipis, note berisi alternatif konkret (turunkan diskon ke x%, ganti bundling, naikkan min. belanja).

TARGET, STOK & DUKUNGAN
- Target per event berbasis penjualan harian normal (dari data user; bila tidak ada, asumsikan & tulis "perkiraan" di summary): tanggal kembar ±3-8× hari biasa,
  Harbolnas ±5-10×, payday ±1,5-2,5×, flash sale mingguan ±1,2-1,5× pada hari itu. target_revenue = unit × harga promo rata-rata.
- Stok: unit dibutuhkan = Σ(penjualan harian × pengali event × durasi) + penjualan hari biasa + safety stock 20-30%. Stok di gudang paling lambat H-7;
  bila memakai gudang platform (fulfillment by Shopee/TikTok), kirim ±H-14.
- Dukungan konkret: jadwal live (jam & durasi, mis. 2 sesi × 3 jam hari-H), skala iklan (naikkan budget 2-3× pada H-1 s/d hari-H lalu turunkan H+2,
  sebut target ROAS), komisi affiliate saat event (mis. naik ke 10-15%), broadcast chat ke follower.
- Checklist: 3-5 tugas spesifik per fase (H-14, H-7, H-1, Hari-H, H+1) dengan peran penanggung jawab.
- KPI: GMV, unit, conversion rate toko, ROAS iklan, AOV, rating & ulasan, persentase pesanan dikirim tepat waktu.`;
  },
  post(out, input) {
    const p = period(input);
    const fixTwin = (c: PromoOutput["campaigns"][number]) => {
      const len = Math.max(0, diffDays(c.start, c.end));
      if (/pemanasan|pre-?sale|pre-?order|warm|teaser|menuju|countdown|after|extend|perpanjang|pasca|sisa/i.test(c.event)) return c;
      const twin = c.event.match(/\b(\d{1,2})\s*[./]\s*(\d{1,2})\b/);
      let target: string | null = null;
      if (twin && twin[1] === twin[2] && Number(twin[1]) >= 1 && Number(twin[1]) <= 12) {
        const mm = pad(Number(twin[1]));
        const ym = p.months.find((x) => x.endsWith(`-${mm}`));
        if (ym) target = `${ym}-${mm}`;
      } else if (/harbolnas/i.test(c.event)) {
        const ym = p.months.find((x) => x.endsWith("-12"));
        if (ym) target = `${ym}-12`;
      } else if (/payday|gajian/i.test(c.event) && !/awal|tanggal 1\b|tgl 1\b/i.test(c.event) && Number(c.start.slice(8, 10)) >= 15) {
        target = `${c.start.slice(0, 7)}-25`;
      }
      if (!target || (c.start <= target && target <= c.end)) return c;
      return { ...c, start: target, end: addDays(target, Math.min(len, 3)) };
    };
    out.campaigns = out.campaigns
      .filter((c) => valid(c.start))
      .map((c) => ({ ...c, end: valid(c.end) && c.end >= c.start ? c.end : c.start }))
      .map(fixTwin)
      .filter((c) => c.end >= p.from && c.start <= p.to)
      .map((c) => ({
        ...c,
        start: c.start < p.from ? p.from : c.start,
        end: c.end > p.to ? p.to : c.end,
        target_units: c.target_units === null ? null : Math.max(0, Math.round(c.target_units)),
        target_revenue: c.target_revenue === null ? null : Math.max(0, Math.round(c.target_revenue)),
      }))
      .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
    out.margins = out.margins.filter((m) => Number(m.price) > 0).map(calcMargin);
    out.checklist = [...out.checklist].sort((a, b) => CHECK_PHASES.indexOf(a.phase) - CHECK_PHASES.indexOf(b.phase));
  },
  title: (_out, input) => {
    const p = period(input);
    const a = monthLabel(p.months[0]);
    const b = monthLabel(p.months[p.months.length - 1]);
    return `Kalender promo ${a === b ? a : `${a} – ${b}`} — ${input.store}`;
  },
  files(out, input) {
    const p = period(input);
    const label = p.months.length > 1 ? `${monthLabel(p.months[0])} – ${monthLabel(p.months[p.months.length - 1])}` : monthLabel(p.months[0]);
    const range = (c: PromoOutput["campaigns"][number]) => (c.start === c.end ? fmtDate(c.start) : `${fmtDate(c.start)}–${fmtDate(c.end)}`);
    const totalRev = out.campaigns.reduce((s, c) => s + (c.target_revenue ?? 0), 0);
    const totalUnits = out.campaigns.reduce((s, c) => s + (c.target_units ?? 0), 0);
    const losing = out.margins.filter((m) => m.status === "rugi").length;
    const big = out.campaigns.filter((c) => c.scale !== "rutin");
    const withRev = out.campaigns.filter((c) => (c.target_revenue ?? 0) > 0).slice(0, 12);
    const phases = CHECK_PHASES.map((ph) => ({ ph, tasks: out.checklist.filter((c) => c.phase === ph) })).filter((g) => g.tasks.length);
    const voucherText = (c: PromoOutput["campaigns"][number]) =>
      c.vouchers.map((v) => `${v.name}: ${v.discount}${v.min_spend ? ` min. ${rpText(v.min_spend)}` : ""}${v.quota ? ` (kuota ${v.quota})` : ""}`).join("; ");

    return {
      name: `kalender-promo-${fileSlug(String(input.store))}-${p.months[0]}`,
      deckLabel: "PPT ringkasan promo",
      sheetLabel: "Excel kalender & hitung margin",
      deck: {
        title: clip(`Kalender Promo ${label}`, 90),
        subtitle: clip(`${input.store} · ${out.campaigns.length} campaign`, 160),
        theme: "sunset",
        cover_style: "split",
        slides: [
          { layout: "quote", kicker: "ARAH PROMO", title: "Ringkasan", quote: clip(out.summary, 240) },
          {
            layout: "stats",
            kicker: "TARGET PERIODE",
            title: "Angka yang dikejar",
            stats: [
              { value: clip(shortRpText(totalRev), 12), label: "Target omzet semua campaign", note: "Jumlah target per event" },
              { value: clip(totalUnits.toLocaleString("id-ID"), 12), label: "Target unit terjual" },
              { value: String(out.campaigns.length), label: "Campaign", note: clip(`${big.length} event besar/sedang`, 80) },
              { value: String(losing), label: "Skenario margin rugi", note: losing ? "Wajib direvisi sebelum tayang" : "Semua skenario tidak rugi" },
            ],
          },
          {
            layout: "cards",
            kicker: "STRATEGI",
            title: "Cara menang tanpa bakar margin",
            cards: [
              { icon: "target", title: "Fokus produk", text: clip(out.strategy.focus, 160) },
              { icon: "shield", title: "Penjaga margin", text: clip(out.strategy.margin_guard, 160) },
              { icon: "zap", title: "Mesin trafik", text: clip(out.strategy.traffic, 160) },
            ],
          },
          {
            layout: "timeline",
            kicker: "EVENT UTAMA",
            title: "Momen yang jadi tumpuan omzet",
            steps: atLeast(
              (big.length ? big : out.campaigns).slice(0, 6).map((c) => ({ title: clip(`${c.event} · ${range(c)}`, 40), text: clip(c.mechanism, 120) })),
              3,
              { title: "Flash sale mingguan", text: "1-2 produk, kuota terbatas, jam ramai 12.00 & 20.00." },
            ),
          },
          ...chunk(out.campaigns, 7)
            .slice(0, 3)
            .map((rows, i) => ({
              layout: "table" as const,
              kicker: i ? `KALENDER (${i + 1})` : "KALENDER",
              title: "Jadwal campaign",
              table: {
                headers: ["Tanggal", "Event", "Mekanisme", "Target"],
                rows: rows.map((c) => [clip(range(c), 60), clip(c.event, 60), clip(c.mechanism, 60), clip(c.target_revenue ? shortRpText(c.target_revenue) : "-", 60)]),
              },
            })),
          ...(withRev.length >= 2
            ? [
                {
                  layout: "chart" as const,
                  kicker: "TARGET PER EVENT",
                  title: "Sebaran target omzet",
                  subtitle: "Dalam juta Rupiah",
                  chart: { type: "bar" as const, labels: withRev.map((c) => clip(c.event, 30)), series: [{ name: "Target omzet", values: withRev.map((c) => +((c.target_revenue ?? 0) / 1e6).toFixed(1)) }], unit: "jt" },
                },
              ]
            : []),
          ...(out.margins.length
            ? [
                {
                  layout: "table" as const,
                  kicker: "HITUNG MARGIN",
                  title: "Margin setelah promo",
                  subtitle: "Harga promo − HPP − biaya platform − biaya lain (dihitung sistem)",
                  table: {
                    headers: ["Produk · skenario", "Harga promo", "Margin/unit", "Status"],
                    rows: out.margins.slice(0, 7).map((m) => [clip(`${m.product} · ${m.scenario}`, 60), rpText(m.promo_price), clip(`${rpText(m.margin_rp)} (${m.margin_pct}%)`, 60), MARGIN_LABEL[m.status]]),
                  },
                },
              ]
            : []),
          {
            layout: "cards",
            kicker: "PERSIAPAN",
            title: "Checklist menjelang event besar",
            cards: atLeast(
              phases.slice(0, 6).map((g) => ({ icon: g.ph === "Hari-H" ? "rocket" : g.ph === "H+1" ? "chart-bar" : "clock", title: g.ph, text: clip(g.tasks.map((t) => t.task).join("; "), 160) })),
              2,
              { icon: "package", title: "Stok", text: "Stok event sudah di gudang paling lambat H-7." },
            ),
          },
          { layout: "closing", title: "KPI & risiko yang dipantau", bullets: [...out.kpis.slice(0, 4).map((k) => `${k.metric}: ${k.target}`), ...out.risks.slice(0, 2)].map((b) => clip(b, 140)) },
        ],
      },
      sheets: [
        {
          name: "Kalender campaign",
          title: `Kalender promo ${label} — ${input.store}`,
          columns: [
            { header: "Mulai", key: "start", width: 12 },
            { header: "Selesai", key: "end", width: 12 },
            { header: "Hari", key: "day", width: 9 },
            { header: "Event", key: "event", width: 20 },
            { header: "Skala", key: "scale", width: 16 },
            { header: "Platform", key: "platforms", width: 18 },
            { header: "Mekanisme", key: "mechanism", width: 50 },
            { header: "Voucher", key: "vouchers", width: 44 },
            { header: "Produk unggulan", key: "hero", width: 30 },
            { header: "Target unit", key: "target_units", width: 12 },
            { header: "Target omzet", key: "target_revenue", width: 16, money: true },
            { header: "Dukungan (live, iklan, KOL)", key: "support", width: 44 },
            { header: "Persiapan", key: "prep", width: 44 },
          ],
          rows: [
            ...out.campaigns.map((c) => ({
              start: c.start,
              end: c.end,
              day: dayName(c.start),
              event: c.event,
              scale: SCALE_LABEL[c.scale],
              platforms: c.platforms,
              mechanism: c.mechanism,
              vouchers: voucherText(c),
              hero: c.hero_products.join(", "),
              target_units: c.target_units,
              target_revenue: c.target_revenue,
              support: c.support,
              prep: c.prep,
            })),
            { event: "TOTAL", target_units: totalUnits, target_revenue: totalRev },
          ],
          rowColor: (r) => (r.scale === SCALE_LABEL.besar ? "FFF1E6" : r.event === "TOTAL" ? "EEF0FF" : null),
        },
        {
          name: "Hitung margin",
          title: "Margin = Harga promo − HPP − (Harga promo × biaya platform %) − biaya lain · rugi < 0, tipis < 10%, aman ≥ 10%",
          columns: [
            { header: "Produk", key: "product", width: 26 },
            { header: "Skenario", key: "scenario", width: 20 },
            { header: "Harga normal", key: "price", width: 14, money: true },
            { header: "Diskon %", key: "discount_pct", width: 10 },
            { header: "Harga promo", key: "promo_price", width: 14, money: true },
            { header: "HPP", key: "cogs", width: 13, money: true },
            { header: "Biaya platform %", key: "platform_fee_pct", width: 12 },
            { header: "Biaya platform Rp", key: "fee_rp", width: 14, money: true },
            { header: "Biaya lain/unit", key: "other_cost", width: 14, money: true },
            { header: "Margin Rp", key: "margin_rp", width: 14, money: true },
            { header: "Margin %", key: "margin_pct", width: 10 },
            { header: "Status", key: "status", width: 10 },
            { header: "Catatan", key: "note", width: 50 },
          ],
          rows: out.margins.map((m) => ({ ...m, fee_rp: platformFeeRp(m), other_cost: m.other_cost ?? 0, status: MARGIN_LABEL[m.status] })),
          rowColor: (r) => (r.status === "Rugi" ? "FDECEC" : r.status === "Tipis" ? "FFF7E0" : "E8F8EF"),
        },
        {
          name: "Persiapan stok",
          columns: [
            { header: "Produk", key: "product", width: 28 },
            { header: "Event puncak", key: "peak_event", width: 18 },
            { header: "Unit dibutuhkan", key: "units_needed", width: 16 },
            { header: "Siap di gudang", key: "ready_by", width: 18 },
            { header: "Dasar hitungan", key: "note", width: 60 },
          ],
          rows: out.stock,
        },
        {
          name: "Checklist",
          columns: [
            { header: "Fase", key: "phase", width: 10 },
            { header: "Tugas", key: "task", width: 70 },
            { header: "PIC", key: "owner", width: 18 },
            { header: "Selesai?", key: "done", width: 10 },
          ],
          rows: out.checklist.map((c) => ({ ...c, done: "☐" })),
        },
        {
          name: "KPI & risiko",
          columns: [
            { header: "KPI / Risiko", key: "a", width: 40 },
            { header: "Target / Antisipasi", key: "b", width: 70 },
          ],
          rows: [...out.kpis.map((k) => ({ a: k.metric, b: k.target })), { a: "", b: "" }, ...out.risks.map((r, i) => ({ a: `Risiko ${i + 1}`, b: r }))],
        },
      ],
    };
  },
};

const fmtDate = (s: string) => `${Number(s.slice(8, 10))}/${Number(s.slice(5, 7))}`;
const rpText = (n: number | null) => (n === null ? "-" : `Rp${Math.round(n).toLocaleString("id-ID")}`);
function shortRpText(n: number) {
  if (Math.abs(n) >= 1e9) return `Rp${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (Math.abs(n) >= 1e6) return `Rp${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return rpText(n);
}
function chunk<T>(list: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

export const promoRunner = makeRunner(promoDef);
