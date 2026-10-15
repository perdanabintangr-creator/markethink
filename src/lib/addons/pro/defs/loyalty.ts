import "server-only";
import { clip, fileSlug } from "../../runtime";
import { atLeast, makeRunner, type ProDef } from "../kit";
import { LOYALTY_MODELS, VERDICT_LABEL, calcRows, computeLoyalty, loyaltyForm, loyaltyInputs, loyaltyOutput, pctText, rpText, type LoyaltyOutput } from "../specs/loyalty";

const shortRpText = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e9) return `${s}Rp${(a / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (a >= 1e6) return `${s}Rp${(a / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return rpText(n);
};

const GUIDE: Record<string, string> = {
  recommend: "Pilih model terbaik berdasarkan angka di bawah; boleh gabungan (mis. poin + tier).",
  points: "User memilih model POIN. Rancang poin; tier boleh sebagai pelengkap bila jelas untung.",
  tier: "User memilih model TIER. Rancang level member dengan benefit bertingkat; poin sebagai mesin naik tier boleh.",
  stamp: "User memilih STAMP CARD (digital/fisik). spend_per_point = belanja minimum per stamp, point_value = nilai hadiah ÷ jumlah stamp.",
  referral: "User memilih REFERRAL. Hadiah dua arah (pengajak & teman); poin/kredit diberikan setelah transaksi pertama teman lunas.",
  paid: "User memilih MEMBER BERBAYAR. Tulis harga keanggotaan di earn_rule/burn_rule, benefit bernilai ≥3× harga, dan masukkan biaya benefit lewat point_value/earn.",
};

export const loyaltyDef: ProDef<typeof loyaltyOutput> = {
  tool: "loyalty",
  addon: "crm_pro",
  form: loyaltyForm,
  output: loyaltyOutput,
  maxOutputTokens: 14000,
  role: `Kamu Loyalty & CRM Strategist yang sudah merancang program member untuk jaringan kopi, restoran, ritel fashion, beauty store, dan apotek di Indonesia.
Kamu dikenal karena program yang tetap untung: setiap poin punya hitungan biaya, hadiahnya murah untuk bisnis tapi berharga untuk pelanggan,
dan kasir bisa menjelaskannya dalam 10 detik.`,
  rules: (input) => {
    const base = Number(input.customers) * Number(input.aov) * Number(input.frequency);
    const model = LOYALTY_MODELS.find(([k]) => k === String(input.model))?.[1] ?? "Rekomendasikan saja";
    return `- Angka user: ${Number(input.customers).toLocaleString("id-ID")} pelanggan aktif, AOV ${rpText(Number(input.aov))}, ${input.frequency}× beli/tahun,
  gross margin ${input.margin}%. Omzet tahunan dasar (dihitung sistem) = ${rpText(base)}. Model diminta: ${model}. ${GUIDE[String(input.model)] ?? GUIDE.recommend}
${input.budget ? `- Batas budget user: ${input.budget}. fixed_cost_year dan biaya hadiah harus muat.` : "- Budget tidak disebut: rancang biaya program total ≤ 3-5% omzet anggota."}

PEMILIHAN MODEL
- Frekuensi tinggi (≥12×/th) & AOV < Rp100 rb (kopi, F&B, laundry) → stamp card atau poin sederhana; hadiah = produk sendiri.
- Frekuensi sedang & AOV sedang (ritel, beauty, fashion) → poin + tier.
- Frekuensi rendah & AOV tinggi (furnitur, elektronik, klinik) → tier berbasis layanan + referral; poin kecil tidak terasa.
- Pelanggan inti sangat loyal & sering beli → member berbayar layak dipertimbangkan (benefit ≥3× harga member).
- Biaya akuisisi mahal & pelanggan puas → referral dua arah.
- Tulis model lain yang dipertimbangkan di not_chosen, dengan alasan berbasis angka user.

EARN & BURN
- Earn rate (nilai 1 poin ÷ belanja per poin) umumnya 2-5% bila margin ≥50%, 0,5-2% bila margin <30%. Biaya hadiah efektif (earn rate × redemption × pengali tier)
  harus jauh di bawah gross margin, dan break-even uplift idealnya ≤10%.
- spend_per_point & point_value WAJIB konsisten dengan earn_rule dan katalog hadiah (poin hadiah × point_value ≈ harga jual hadiah ke pelanggan).
- Hadiah pertama bisa diraih dalam ±1 siklus belanja (3-5 transaksi) agar pelanggan merasa dekat (goal-gradient); hadiah besar untuk pelanggan inti.
- Utamakan hadiah produk sendiri/pengalaman (menu rahasia, upgrade ukuran, early access, layanan prioritas) — biaya riil = HPP, nilai di mata pelanggan = harga jual.
  Hindari cashback tunai. Isi cost hadiah dengan HPP perkiraan.
- Masa berlaku poin 12 bulan sejak didapat, dengan pengingat 30 hari sebelum hangus. Tentukan apakah poin bisa digabung promo lain (sarankan tidak).

TIER
- Syarat berbasis belanja/transaksi 12 bulan bergulir; tier teratas ±5-15% anggota. Pengali poin 1-2×. Benefit tier tinggi sebisa mungkin murah tapi terasa eksklusif.

ASUMSI (realistis, konservatif)
- Partisipasi 20-50% (lebih tinggi bila pendaftaran cukup nomor HP di kasir), redemption 40-70%, uplift frekuensi anggota 5-20% (dasar 8-12%),
  avg_multiplier = rata-rata tertimbang pengali seluruh anggota (mis. 1,1). fixed_cost_year: biaya aplikasi member/fitur loyalty POS (perkiraan), kartu/materi cetak, pelatihan.
- Sistem akan MENGHITUNG ULANG omzet, biaya, laba, ROI dan break-even dari angka-angka ini. Jangan menulis angka ROI/untung bersih di summary atau teks lain.

PELUNCURAN, MATERI & RISIKO
- Launch 3-5 fase dengan target terukur (mis. jumlah pendaftar per hari per outlet). Skrip kasir ≤ 2 kalimat (bisa diucapkan 10 detik).
- comms: minimal pengumuman WhatsApp, caption Instagram, skrip kasir; tambah skrip CS bila ada penjualan online. Bahasa pelanggan, sebut cara daftar & hadiah pertama.
- Risiko & kecurangan: poin hanya dari transaksi tercatat di POS, verifikasi nomor (OTP), kasir dilarang memakai nomor sendiri, batas poin per hari per akun,
  referral cair setelah transaksi teman lunas & lewat masa retur, audit mingguan transaksi janggal, liabilitas poin dicatat di pembukuan, S&K tertulis, data pribadi sesuai UU PDP.`;
  },
  post(out, input) {
    out.rewards = [...out.rewards].filter((r) => r.points > 0).sort((a, b) => a.points - b.points);
    out.tiers = out.tiers.map((t) => ({ ...t, multiplier: t.multiplier === null ? null : Math.min(5, Math.max(1, t.multiplier)) }));
    const economics = computeLoyalty(loyaltyInputs(out, input), out.rewards);
    out.rewards = out.rewards.map((r) => ({ ...r, face_value: Math.round(r.points * economics.point_value) }));
    (out as Record<string, unknown>).economics = economics;
  },
  title: (out) => `Program loyalitas ${out.model.name}`,
  files(raw, input) {
    const out = raw as unknown as LoyaltyOutput;
    const e = out.economics ?? computeLoyalty(loyaltyInputs(raw, input), raw.rewards);
    const rows = calcRows(e);
    const brand = clip(String(input.business).split(/\s[—–-]\s|[,.\n(:]/)[0].trim() || out.model.name, 40);
    return {
      name: `program-loyalitas-${fileSlug(out.model.name || brand)}`,
      deckLabel: "PPT program loyalitas",
      sheetLabel: "Excel kalkulasi program",
      deck: {
        title: clip(out.model.name, 90),
        subtitle: clip(`Program pelanggan setia · ${brand}`, 160),
        theme: "luxe",
        cover_style: "split",
        slides: [
          { layout: "quote", kicker: "REKOMENDASI", title: "Ringkasan", quote: clip(out.summary, 240) },
          {
            layout: "cards",
            kicker: "MODEL PROGRAM",
            title: clip(`Kenapa ${out.model.type}`, 90),
            cards: [
              { icon: "crown", title: "Alasan", text: clip(out.model.why, 160) },
              { icon: "gift", title: "Dapat poin", text: clip(out.earn_burn.earn_rule, 160) },
              { icon: "ticket", title: "Tukar poin", text: clip(out.earn_burn.burn_rule, 160) },
              { icon: "compass", title: "Tidak dipilih", text: clip(out.model.not_chosen, 160) },
            ],
          },
          {
            layout: "stats",
            kicker: "HITUNGAN PROGRAM",
            title: clip(`Program ${VERDICT_LABEL[e.verdict].toLowerCase()}`, 90),
            stats: [
              { value: clip(shortRpText(e.base_revenue), 12), label: "Omzet tahunan dasar", note: "Pelanggan × AOV × frekuensi" },
              { value: clip(shortRpText(e.total_cost), 12), label: "Biaya program per tahun", note: clip(`${pctText(e.cost_pct_of_member_revenue)} dari omzet anggota`, 80) },
              { value: clip(shortRpText(e.net_gain), 12), label: "Untung bersih program", note: clip(`ROI ${pctText(e.roi_pct)}`, 80) },
              { value: clip(pctText(e.breakeven_uplift_pct), 12), label: "Uplift minimal agar impas", note: clip(`Asumsi uplift ${pctText(e.uplift_pct)}`, 80) },
            ],
          },
          {
            layout: "table",
            kicker: "RUMUS",
            title: "Cara angka dihitung",
            table: {
              headers: ["Komponen", "Rumus", "Angka"],
              rows: [rows[4], rows[7], rows[9], rows[12], rows[14], rows[15], rows[16]].map((r) => [clip(r.k, 60), clip(r.f, 60), clip(r.rp !== null ? rpText(r.rp) : r.v, 60)]),
            },
          },
          {
            layout: "chart",
            kicker: "SKENARIO",
            title: "Untung bersih per skenario uplift",
            subtitle: "Juta Rupiah per tahun; negatif = program rugi",
            chart: { type: "bar", labels: e.scenarios.slice(0, 12).map((s) => `Uplift ${s.uplift_pct}%`), series: [{ name: "Untung bersih", values: e.scenarios.slice(0, 12).map((s) => +(s.net_gain / 1e6).toFixed(1)) }], unit: "jt" },
          },
          {
            layout: "cards",
            kicker: "TIER",
            title: "Level member",
            cards: atLeast(
              out.tiers.slice(0, 6).map((t, i) => ({ icon: i === out.tiers.length - 1 ? "crown" : i ? "star" : "user-check", title: clip(t.name, 40), text: clip(`${t.requirement} · ${t.benefits.join(", ")}`, 160) })),
              2,
              { icon: "heart", title: "Semua member", text: clip(out.earn_burn.bonus_rules.join("; ") || "Poin dari setiap transaksi.", 160) },
            ),
          },
          {
            layout: "table",
            kicker: "KATALOG HADIAH",
            title: "Hadiah & biayanya",
            table: {
              headers: ["Hadiah", "Poin", "Nilai ke pelanggan", "Biaya ke bisnis"],
              rows: out.rewards.slice(0, 7).map((r) => [clip(r.reward, 60), r.points.toLocaleString("id-ID"), rpText(Math.round(r.points * e.point_value)), rpText(r.cost)]),
            },
          },
          {
            layout: "timeline",
            kicker: "PELUNCURAN",
            title: "Rencana peluncuran",
            steps: atLeast(
              out.launch.slice(0, 6).map((l) => ({ title: clip(`${l.phase} · ${l.when}`, 40), text: clip(l.actions, 120) })),
              3,
              { title: "Evaluasi bulan ke-3", text: "Cek partisipasi, redemption & frekuensi anggota vs non-anggota." },
            ),
          },
          {
            layout: "table",
            kicker: "RISIKO",
            title: "Pencegahan kecurangan",
            table: { headers: ["Risiko", "Pencegahan"], rows: out.risks.slice(0, 7).map((r) => [clip(r.risk, 60), clip(r.prevention, 60)]) },
          },
          { layout: "closing", title: "KPI program", bullets: out.kpis.slice(0, 6).map((k) => clip(`${k.metric}: ${k.target}`, 140)) },
        ],
      },
      sheets: [
        {
          name: "Kalkulasi",
          title: `Kalkulasi program ${out.model.name} (dihitung sistem, per tahun)`,
          columns: [
            { header: "Komponen", key: "k", width: 34 },
            { header: "Rumus", key: "f", width: 60 },
            { header: "Rupiah", key: "rp", width: 18, money: true },
            { header: "Angka / %", key: "v", width: 30 },
          ],
          rows,
          rowColor: (r) => (r.k === "Untung bersih program" ? (e.net_gain < 0 ? "FDECEC" : "E8F8EF") : r.f === "Asumsi" || r.f === "Input" ? "F5F5FA" : null),
        },
        {
          name: "Skenario uplift",
          title: "Untung bersih program pada berbagai kenaikan frekuensi anggota",
          columns: [
            { header: "Uplift frekuensi %", key: "uplift_pct", width: 18 },
            { header: "Laba kotor tambahan", key: "incremental_profit", width: 20, money: true },
            { header: "Total biaya program", key: "total_cost", width: 20, money: true },
            { header: "Untung bersih", key: "net_gain", width: 20, money: true },
          ],
          rows: e.scenarios,
          rowColor: (r) => (Number(r.net_gain) < 0 ? "FDECEC" : "E8F8EF"),
        },
        {
          name: "Tier & hadiah",
          columns: [
            { header: "Tier / Hadiah", key: "a", width: 30 },
            { header: "Syarat / Poin", key: "b", width: 40 },
            { header: "Benefit / Catatan", key: "c", width: 60 },
            { header: "Nilai ke pelanggan", key: "face", width: 18, money: true },
            { header: "Biaya ke bisnis", key: "cost", width: 18, money: true },
          ],
          rows: [
            ...out.tiers.map((t) => ({ a: t.name, b: t.requirement, c: `${t.multiplier ? `Poin ${t.multiplier}× · ` : ""}${t.benefits.join("; ")}` })),
            { a: "" },
            ...out.rewards.map((r) => ({ a: r.reward, b: `${r.points.toLocaleString("id-ID")} poin`, c: r.note, face: Math.round(r.points * e.point_value), cost: r.cost })),
          ],
        },
        {
          name: "Aturan & asumsi",
          columns: [
            { header: "Bagian", key: "a", width: 26 },
            { header: "Isi", key: "b", width: 90 },
          ],
          rows: [
            { a: "Dapat poin", b: out.earn_burn.earn_rule },
            { a: "Tukar poin", b: out.earn_burn.burn_rule },
            { a: "Masa berlaku", b: out.earn_burn.expiry },
            ...out.earn_burn.bonus_rules.map((b) => ({ a: "Bonus", b })),
            { a: "Dasar asumsi", b: out.assumptions.notes },
          ],
        },
        {
          name: "Peluncuran & materi",
          columns: [
            { header: "Fase / Kanal", key: "a", width: 26 },
            { header: "Waktu / Judul", key: "b", width: 26 },
            { header: "Aksi / Teks siap pakai", key: "c", width: 90 },
          ],
          rows: [
            ...out.launch.map((l) => ({ a: l.phase, b: l.when, c: l.actions })),
            { a: "" },
            ...out.comms.map((c) => ({ a: c.channel, b: c.title, c: c.text })),
          ],
        },
        {
          name: "KPI & risiko",
          columns: [
            { header: "KPI / Risiko", key: "a", width: 40 },
            { header: "Target / Pencegahan", key: "b", width: 80 },
          ],
          rows: [...out.kpis.map((k) => ({ a: k.metric, b: k.target })), { a: "" }, ...out.risks.map((r) => ({ a: r.risk, b: r.prevention }))],
        },
      ],
    };
  },
};

export const loyaltyRunner = makeRunner(loyaltyDef);
