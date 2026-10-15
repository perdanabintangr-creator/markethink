import "server-only";
import { clip, fileSlug } from "../../runtime";
import { atLeast, makeRunner, type ProDef } from "../kit";
import {
  METRIC_LABEL,
  OBJECTIVE_LABEL,
  PRIMARY_METRIC,
  TIER_LABEL,
  VERDICT_COLOR,
  VERDICT_LABEL,
  WEIGHTS,
  computeKol,
  kolNum,
  kolRp,
  kolreportForm,
  kolreportOutput,
  metricText,
  type KolCalc,
  type KolObjective,
} from "../specs/kolreport";

const rpFull = (v: number) => `Rp${new Intl.NumberFormat("id-ID").format(Math.round(v))}`;

const objectiveOf = (input: Record<string, unknown>): KolObjective =>
  (["awareness", "engagement", "penjualan", "install"] as const).find((o) => o === input.objective) ?? "penjualan";

const FOCUS: Record<KolObjective, string> = {
  awareness: "jangkauan murah: views besar dengan CPM rendah, view rate (views/followers) sehat, dan konten yang ditonton sampai habis",
  engagement: "interaksi berkualitas: ER berbasis views, CPE rendah, komentar & save yang menunjukkan minat nyata (bukan komentar 'mantap kak')",
  penjualan: "penjualan teratribusi: ROAS dan biaya per order (CPO); klik & order dari link affiliate/keranjang kuning/kode voucher",
  install: "install/pendaftaran teratribusi: biaya per install (CPI = fee/orders) dan biaya per klik",
};

const weightText = (o: KolObjective) =>
  Object.entries(WEIGHTS[o])
    .map(([m, w]) => `${METRIC_LABEL[m as keyof typeof METRIC_LABEL]} ${Math.round((w ?? 0) * 100)}%`)
    .join(", ");

export const kolreportDef: ProDef<typeof kolreportOutput> = {
  tool: "kolreport",
  addon: "kolpr_pro",
  form: kolreportForm,
  output: kolreportOutput,
  maxOutputTokens: 14000,
  validate: (input) =>
    !(input.attachment_ids as string[] | undefined)?.length && !String(input.data ?? "").trim()
      ? "Upload file rekap/screenshot insight kreator atau tulis data per kreator dulu, ya — minimal nama kreator dan angka hasilnya."
      : null,
  role: `Kamu KOL & Affiliate Manager senior di agency Indonesia yang tiap bulan mengelola ratusan kreator (nano sampai mega) di TikTok, Instagram,
dan YouTube untuk brand beauty, F&B, fashion, dan aplikasi. Laporanmu ke klien dikenal jujur dan tegas: kreator dinilai dengan angka,
bukan dengan rasa suka, dan setiap laporan berakhir dengan keputusan gelombang berikutnya (siapa lanjut, siapa dinego, siapa distop).`,
  rules: (input) => {
    const o = objectiveOf(input as Record<string, unknown>);
    return `- Kampanye: ${input.campaign}${input.brand ? ` (${input.brand})` : ""}. Tujuan: ${OBJECTIVE_LABEL[o]} → fokus penilaian: ${FOCUS[o]}.

MEMBACA DATA
- Satu baris per kreator. Bila satu kreator punya beberapa konten (mis. 1 Reels + 3 Story), JUMLAHKAN angkanya dan tulis formatnya di "content".
- Pakai HANYA angka dari file/data/screenshot user. Angka yang tidak ada = null (jangan 0, jangan diperkirakan). 0 hanya bila data menyebut 0.
- Rupiah ditulis angka penuh: "Rp2,5 jt" → 2500000, "750rb" → 750000. Fee = biaya tunai; bila data menyebut nilai produk/barter, tambahkan dan catat di note.
- Singkatan angka sosial media: "12,3K"/"12,3rb" → 12300; "1,2M"/"1,2jt" views/followers → 1200000 (M di sosial media = juta, BUKAN miliar).
- Screenshot insight: Instagram → Views/Plays sebagai views (bila hanya ada Reach/Accounts reached, pakai itu dan catat di data_notes), Likes, Comments,
  Shares, Saves, Link clicks/Sticker taps = clicks. TikTok → Video views, Likes, Comments, Shares, Favorites = saves. TikTok Shop/Shopee Affiliate →
  item terjual/pesanan = orders, GMV = revenue, klik produk = clicks.
- Isi likes/comments/shares/saves bila rinciannya ada (sistem menjumlahkan sendiri menjadi engagement). Isi "engagements" hanya bila data cuma memberi total.
- Orders & revenue hanya yang teratribusi ke kreator (kode voucher, link affiliate, UTM). JANGAN membagi omzet toko secara rata ke kreator.

PERHITUNGAN (dikerjakan sistem, bukan kamu)
- Sistem menghitung sendiri: tier (nano <10rb, micro 10-100rb, macro 100rb-1jt, mega ≥1jt followers), ER = engagement/views (atau /followers bila views
  tidak ada), CPM = fee/views×1000, CPE = fee/engagement, CPC = fee/klik, CPO = fee/order, ROAS = omzet/fee, lalu skor 0-100 dengan bobot ${weightText(o)}.
  Verdict: skor ≥65 lanjut, 40-64 negosiasi ulang, <40 stop. Tidak perlu menuliskan angka-angka itu, tetapi analisis, next_step, dan rekomendasimu HARUS
  konsisten dengan logika ini (hitung sendiri secara kasar untuk menilai).
- Patokan pasar Indonesia (sebut sebagai patokan, bukan kepastian): CPM kreator Rp15-60rb wajar, <Rp15rb sangat efisien; ER berbasis views TikTok 4-8%,
  IG Reels 3-6%; nano/micro biasanya ER lebih tinggi & CPM lebih murah daripada macro/mega; ROAS impas = 1/margin kotor (margin 50% → impas 2x);
  ROAS ≥3x sehat untuk beauty/fashion/F&B. Bila user memberi target/margin di catatan, pakai itu sebagai pembanding.

ANALISIS
- insights 3-5: bandingkan tier (micro vs macro), platform, format (video TikTok vs Reels vs Story vs live), angle konten (review jujur, tutorial,
  GRWM, unboxing, before-after, storytelling, komedi), waktu tayang, dan pemakaian boost/whitelisting. Setiap insight WAJIB berbukti angka dari data
  (mis. "4 micro TikTok: CPM rata-rata Rp9rb vs 2 macro IG Rp41rb"). Bila datanya tidak cukup untuk membandingkan, jangan dipaksakan.
- lessons 3-5 untuk brief berikutnya: hook 3 detik pertama, format & durasi, CTA (kode voucher, keranjang kuning, link bio, live), waktu tayang,
  kecocokan kreator–produk. "example" berisi contoh nyata dari data atau contoh kalimat hook siap dipakai.
- next_step per kreator, konkret & bisa dieksekusi, contoh: "Lanjut 2 video + minta izin Spark Ads 30 hari untuk kontennya yang tembus 140rb views",
  "Nego fee turun ke kisaran yang membuat CPM ≤ median kampanye, atau minta bonus 3 Story + link sticker dengan fee tetap",
  "Stop: 98rb views tapi hanya 4 order; audiens tidak cocok dengan produk Rp119rb". Jangan mengarang isi komentar atau demografi yang tidak ada di data.
- next_wave: arah gelombang berikutnya (jumlah kreator per tier/platform, mekanisme fee: fixed vs fee kecil + komisi affiliate, whitelisting/Spark Ads/
  Partnership Ads untuk konten pemenang). budget 3-5 pos yang totalnya 100%, digeser dari yang boros ke yang efisien. budget_total hanya bila bisa
  disimpulkan (mis. sama dengan total fee kampanye ini atau disebut user), selain itu null. tests 2-3 eksperimen yang bisa diukur.
- headline & summary untuk klien: sebut total fee, hasil utama sesuai tujuan, 1-2 kreator terbaik beserta angkanya, yang boros, dan keputusan.
- data_notes: data yang tidak tersedia (mis. tanpa order → ROAS tak bisa dihitung), cara atribusi, dan asumsi yang dipakai.`;
  },
  post(out, input) {
    const objective = objectiveOf(input);
    out.creators = out.creators.filter((c) => String(c.name ?? "").trim());
    const total = out.next_wave.budget.reduce((s, b) => s + (Number(b.share_pct) || 0), 0);
    if (total > 0 && Math.abs(total - 100) > 1) {
      out.next_wave.budget = out.next_wave.budget.map((b) => ({ ...b, share_pct: Math.round(((Number(b.share_pct) || 0) / total) * 100) }));
    }
    (out as Record<string, unknown>).calc = computeKol(out.creators, objective);
  },
  title: (_out, input) => `Laporan KOL — ${input.campaign}${input.brand ? ` (${input.brand})` : ""}`,
  files(out, input) {
    const calc = (out as { calc?: KolCalc }).calc ?? computeKol(out.creators, objectiveOf(input));
    const o = calc.objective;
    const T = calc.totals;
    const primary = PRIMARY_METRIC[o];
    const rows = calc.rows;
    const scored = rows.filter((r) => r.score !== null).slice(0, 12);
    const withPrimary = rows.filter((r) => r[primary] !== null).slice(0, 12);
    const label = String(input.campaign);
    const period = String(input.period ?? "");

    const kpiStats = [
      { value: kolRp(T.fee), label: "Total fee kreator", note: `${T.creators} kreator` },
      { value: kolNum(T.views), label: "Total views", note: T.cpm !== null ? `CPM ${kolRp(T.cpm)}` : "" },
      o === "penjualan"
        ? { value: T.roas !== null ? metricText("roas", T.roas) : kolRp(T.revenue), label: T.roas !== null ? "ROAS kampanye" : "Omzet teratribusi", note: `Omzet ${kolRp(T.revenue)} · ${kolNum(T.orders)} order` }
        : o === "install"
          ? { value: kolNum(T.orders), label: "Install / pendaftaran", note: T.cpo !== null ? `CPI ${kolRp(T.cpo)}` : "" }
          : { value: metricText("er", T.er), label: "ER rata-rata (views)", note: T.cpe !== null ? `CPE ${kolRp(T.cpe)}` : "" },
      { value: `${calc.counts.lanjut}/${calc.counts.negosiasi}/${calc.counts.stop}`, label: "Lanjut / nego / stop", note: T.avg_score !== null ? `Skor rata-rata ${T.avg_score}` : "" },
    ];

    const groups = (v: "lanjut" | "negosiasi" | "stop") =>
      rows.filter((r) => r.verdict === v).slice(0, 4).map((r) => clip(`${r.name} (skor ${r.score ?? "-"}): ${r.next_step}`, 100));

    return {
      name: `laporan-kol-${fileSlug(label)}`,
      deckLabel: "PPT laporan KOL untuk klien",
      sheetLabel: "Excel peringkat kreator",
      deck: {
        title: clip(`Laporan Performa KOL — ${label}`, 90),
        subtitle: clip([input.brand, period, `Tujuan: ${OBJECTIVE_LABEL[o]}`].filter(Boolean).join(" · "), 160),
        theme: "corporate",
        cover_style: "split",
        slides: [
          { layout: "quote", kicker: "RINGKASAN", title: "Kesimpulan kampanye", quote: clip(out.headline, 240) },
          {
            layout: "bullets",
            kicker: "RINGKASAN EKSEKUTIF",
            title: "Apa yang terjadi & keputusannya",
            bullets: out.summary
              .split(/(?<=[.!?])\s+(?=[A-Z0-9@])/)
              .map((x) => x.trim())
              .filter(Boolean)
              .slice(0, 5)
              .map((x) => clip(x, 140)),
          },
          { layout: "stats", kicker: "KPI KAMPANYE", title: "Hasil total kampanye", stats: kpiStats.map((s) => ({ value: clip(s.value, 12), label: clip(s.label, 60), note: clip(s.note, 80) })) },
          {
            layout: "chart",
            kicker: "PERINGKAT",
            title: "Skor kreator (0-100)",
            subtitle: clip(`Dihitung dari ${weightText(o)}. ≥65 lanjut, 40-64 negosiasi, <40 stop.`, 160),
            chart: { type: "bar", labels: scored.map((r) => clip(r.name, 30)), series: [{ name: "Skor", values: scored.map((r) => r.score ?? 0) }] },
          },
          {
            layout: "chart",
            kicker: "BIAYA PER HASIL",
            title: clip(primary === "roas" ? "ROAS per kreator" : `${METRIC_LABEL[primary]} per kreator`, 90),
            subtitle: primary === "roas" ? "Omzet teratribusi ÷ fee — makin tinggi makin baik" : "Fee ÷ hasil — makin rendah makin efisien (dalam ribu Rupiah)",
            chart: {
              type: "bar",
              labels: withPrimary.map((r) => clip(r.name, 30)),
              series: [{ name: METRIC_LABEL[primary], values: withPrimary.map((r) => +(primary === "roas" ? (r.roas ?? 0) : (r[primary] ?? 0) / 1000).toFixed(2)) }],
              unit: primary === "roas" ? "x" : "rb",
            },
          },
          {
            layout: "table",
            kicker: "TABEL KREATOR",
            title: "Peringkat kreator",
            table: {
              headers: ["Kreator", "Tier · platform", "Fee", primary === "roas" ? "ROAS" : METRIC_LABEL[primary], "Skor · verdict"],
              rows: rows.slice(0, 7).map((r) => [
                clip(`${r.rank}. ${r.name}`, 26),
                clip(`${TIER_LABEL[r.tier]} · ${r.platform}`, 30),
                kolRp(r.fee),
                metricText(primary, r[primary]),
                `${r.score ?? "-"} · ${VERDICT_LABEL[r.verdict]}`,
              ]),
            },
          },
          {
            layout: "cards",
            kicker: "INSIGHT",
            title: "Yang bekerja & yang boros",
            cards: out.insights.slice(0, 4).map((i) => ({ icon: "lightbulb", title: clip(i.title, 40), text: clip(`${i.evidence} → ${i.action}`, 160) })),
          },
          {
            layout: "cards",
            kicker: "PELAJARAN KONTEN",
            title: "Untuk brief gelombang berikutnya",
            cards: out.lessons.slice(0, 4).map((l) => ({ icon: "pen-tool", title: clip(l.aspect, 40), text: clip(`${l.lesson} Contoh: ${l.example}`, 160) })),
          },
          {
            layout: "comparison",
            kicker: "KEPUTUSAN",
            title: "Siapa lanjut, siapa dievaluasi",
            columns: [
              { heading: "Negosiasi ulang / stop", bullets: atLeast([...groups("negosiasi"), ...groups("stop")].slice(0, 4), 1, "Tidak ada kreator yang perlu dinego atau distop.") },
              { heading: "Lanjut", bullets: atLeast(groups("lanjut"), 1, "Belum ada kreator dengan skor ≥65.") },
            ],
          },
          out.next_wave.budget.length >= 2
            ? {
                layout: "chart",
                kicker: "GELOMBANG BERIKUTNYA",
                title: "Usulan alokasi budget",
                subtitle: clip(out.next_wave.strategy, 160),
                chart: { type: "bar", labels: out.next_wave.budget.map((b) => clip(b.bucket, 30)), series: [{ name: "Porsi", values: out.next_wave.budget.map((b) => b.share_pct) }], unit: "%" },
                bullets: out.next_wave.budget.slice(0, 4).map((b) => clip(`${b.share_pct}% ${b.bucket}: ${b.reason}`, 140)),
              }
            : {
                layout: "bullets",
                kicker: "GELOMBANG BERIKUTNYA",
                title: "Arah gelombang berikutnya",
                bullets: [out.next_wave.strategy, ...out.next_wave.budget.map((b) => `${b.share_pct}% ${b.bucket}: ${b.reason}`)].map((b) => clip(b, 140)),
              },
          { layout: "closing", title: "Eksperimen berikutnya", bullets: [...out.next_wave.tests, out.data_notes].filter(Boolean).slice(0, 5).map((b) => clip(b, 140)) },
        ],
      },
      sheets: [
        {
          name: "Peringkat kreator",
          title: `Peringkat kreator — ${label}${period ? ` (${period})` : ""} · tujuan ${OBJECTIVE_LABEL[o]}`,
          columns: [
            { header: "#", key: "rank", width: 5 },
            { header: "Kreator", key: "name", width: 22 },
            { header: "Platform", key: "platform", width: 12 },
            { header: "Tier", key: "tier", width: 8 },
            { header: "Konten", key: "content", width: 22 },
            { header: "Followers", key: "followers", width: 12 },
            { header: "Fee", key: "fee", width: 14, money: true },
            { header: "Views", key: "views", width: 12 },
            { header: "Engagement", key: "engagements", width: 12 },
            { header: "ER %", key: "er", width: 8 },
            { header: "Klik", key: "clicks", width: 9 },
            { header: "Order", key: "orders", width: 9 },
            { header: "Omzet", key: "revenue", width: 15, money: true },
            { header: "CPM", key: "cpm", width: 12, money: true },
            { header: "CPE", key: "cpe", width: 10, money: true },
            { header: "CPC", key: "cpc", width: 10, money: true },
            { header: "CPO", key: "cpo", width: 12, money: true },
            { header: "ROAS", key: "roas", width: 8 },
            { header: "Skor", key: "score", width: 7 },
            { header: "Verdict", key: "verdict", width: 16 },
            { header: "Fee wajar (nego)", key: "fair_fee", width: 15, money: true },
            { header: "Langkah berikutnya", key: "next_step", width: 50 },
            { header: "Catatan konten", key: "note", width: 50 },
          ],
          rows: rows.map((r) => ({
            ...r,
            tier: TIER_LABEL[r.tier],
            er: r.er !== null ? +r.er.toFixed(2) : null,
            cpm: r.cpm !== null ? Math.round(r.cpm) : null,
            cpe: r.cpe !== null ? Math.round(r.cpe) : null,
            cpc: r.cpc !== null ? Math.round(r.cpc) : null,
            cpo: r.cpo !== null ? Math.round(r.cpo) : null,
            roas: r.roas !== null ? +r.roas.toFixed(2) : null,
            verdict: VERDICT_LABEL[r.verdict],
            _v: r.verdict,
            er_base: undefined,
          })),
          rowColor: (r) => VERDICT_COLOR[r._v as keyof typeof VERDICT_COLOR] ?? null,
        },
        {
          name: "Ringkasan kampanye",
          title: `Ringkasan — ${label}`,
          columns: [
            { header: "Metrik", key: "k", width: 30 },
            { header: "Nilai", key: "v", width: 22 },
            { header: "Keterangan", key: "note", width: 60 },
          ],
          rows: [
            { k: "Tujuan kampanye", v: OBJECTIVE_LABEL[o], note: `Bobot skor: ${weightText(o)}` },
            { k: "Jumlah kreator", v: T.creators, note: `Lanjut ${calc.counts.lanjut} · negosiasi ${calc.counts.negosiasi} · stop ${calc.counts.stop} · cek data ${calc.counts.cek_data}` },
            { k: "Total fee", v: rpFull(T.fee), note: T.avg_fee !== null ? `Rata-rata ${kolRp(T.avg_fee)} per kreator` : "" },
            { k: "Total followers", v: T.followers, note: "" },
            { k: "Total views", v: T.views, note: T.avg_views !== null ? `Rata-rata ${kolNum(T.avg_views)} per kreator` : "" },
            { k: "Total engagement", v: T.engagements, note: "Like + komentar + share + save" },
            { k: "Total klik", v: T.clicks, note: "" },
            { k: "Total order", v: T.orders, note: "" },
            { k: "Total omzet teratribusi", v: rpFull(T.revenue), note: "" },
            { k: "ER kampanye", v: metricText("er", T.er), note: "Engagement ÷ views (kreator yang ada views-nya)" },
            { k: "CPM kampanye", v: metricText("cpm", T.cpm), note: "Fee ÷ views × 1.000" },
            { k: "CPE kampanye", v: metricText("cpe", T.cpe), note: "Fee ÷ engagement" },
            { k: "CPC kampanye", v: metricText("cpc", T.cpc), note: "Fee ÷ klik" },
            { k: "CPO kampanye", v: metricText("cpo", T.cpo), note: "Fee ÷ order" },
            { k: "ROAS kampanye", v: metricText("roas", T.roas), note: "Omzet ÷ fee (kreator yang ada omzetnya)" },
            { k: "Skor rata-rata", v: T.avg_score ?? "-", note: "≥65 lanjut, 40-64 negosiasi, <40 stop" },
            { k: "Catatan data", v: "", note: out.data_notes },
          ],
        },
        {
          name: "Rencana gelombang berikutnya",
          title: out.next_wave.strategy,
          columns: [
            { header: "Pos budget", key: "bucket", width: 40 },
            { header: "Porsi %", key: "share_pct", width: 10 },
            { header: "Perkiraan Rp", key: "amount", width: 16, money: true },
            { header: "Alasan", key: "reason", width: 70 },
          ],
          rows: [
            ...out.next_wave.budget.map((b) => ({ ...b, amount: out.next_wave.budget_total ? Math.round((out.next_wave.budget_total * b.share_pct) / 100) : null })),
            ...out.next_wave.tests.map((x, i) => ({ bucket: `Eksperimen ${i + 1}`, share_pct: null, amount: null, reason: x })),
          ],
        },
        {
          name: "Insight & pelajaran",
          columns: [
            { header: "Jenis", key: "kind", width: 14 },
            { header: "Judul", key: "title", width: 36 },
            { header: "Bukti / pelajaran", key: "a", width: 60 },
            { header: "Tindak lanjut / contoh", key: "b", width: 60 },
          ],
          rows: [
            ...out.insights.map((i) => ({ kind: "Insight", title: i.title, a: i.evidence, b: i.action })),
            ...out.lessons.map((l) => ({ kind: "Konten", title: l.aspect, a: l.lesson, b: l.example })),
          ],
        },
      ],
    };
  },
};

export const kolreportRunner = makeRunner(kolreportDef);
