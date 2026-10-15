import "server-only";
import type { z } from "zod";
import { untrusted } from "@/lib/ai/prompt";
import { BASE, fmt, padSteps, shortRp, webResearch } from "./helpers";
import { aiObject, clip, fileSlug, makeDeck, makeWorkbook, withNotes, storeMaybe, storeToolFile, type ToolFile } from "./runtime";
import { sampleSize } from "./sample";
import {
  BIZ_MODEL_LABEL,
  FORCE_LABEL,
  QUESTION_TYPE_LABEL,
  SURVEY_LENGTH,
  SURVEY_TOPIC_LABEL,
  entryInput,
  entryOutput,
  personaInput,
  personaOutput,
  sizingInput,
  sizingOutput,
  surveyInput,
  surveyOutput,
  type EntryOutput,
  type PersonaOutput,
  type SizingOutput,
  type SurveyOutput,
} from "./schemas";
import type { Runner } from "./tools";

/**
 * Market Research Pro — tools riset pasar ala konsultan (pola kerja McKinsey/BCG/Nielsen/Kantar & lembaga riset Indonesia):
 * ukuran pasar (TAM/SAM/SOM), segmentasi & persona, studi kelayakan masuk pasar, desain survei.
 */

const CONSULTANT = `${BASE}
Kamu bekerja seperti konsultan riset pasar kelas dunia (gaya McKinsey/BCG/Nielsen/Kantar) yang paham pasar Indonesia (data BPS, Katadata,
Jakpat, Populix, Inventure, MarkPlus, laporan Google-Temasek-Bain e-Conomy SEA, asosiasi industri). Prinsip: angka harus bisa ditelusuri
(sebut asumsi & sumber), bedakan fakta vs perkiraan, hitung dengan logika yang masuk akal, lalu tutup dengan rekomendasi yang bisa dieksekusi.`;

const RESEARCH_RULES = `Tulis catatan riset faktual (poin-poin) dengan ANGKA + tahun + URL sumbernya. Utamakan sumber Indonesia terbaru
(BPS, kementerian, asosiasi, Katadata, Databoks, Jakpat, Populix, laporan e-Conomy SEA, berita bisnis kredibel). Bila tidak ditemukan, tulis
"tidak ditemukan" — jangan mengarang angka.`;

const lines = (xs: (string | false | undefined | null)[]) => xs.filter(Boolean).join("\n");
const bizLine = (m: keyof typeof BIZ_MODEL_LABEL) => `Model bisnis: ${BIZ_MODEL_LABEL[m]}`;
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const clamp = (v: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, n(v)));
const sourcesSheet = (sources: { title: string; url: string }[]) => ({
  name: "Sumber",
  columns: [
    { header: "Judul", key: "title", width: 60 },
    { header: "URL", key: "url", width: 80 },
  ],
  rows: sources,
});
const sourcesSlide = (sources: { title: string; url: string }[]) => ({
  layout: "closing" as const,
  title: "Sumber riset",
  bullets: sources.length ? sources.slice(0, 5).map((s) => clip(s.title, 140)) : ["Pengetahuan umum AI (tanpa sumber web)"],
});
const store = (files: Promise<ToolFile | null>[]) =>
  Promise.all(files).then((list) => list.filter((f): f is ToolFile => Boolean(f)));

// ============================================================ Ukuran & Tren Pasar

const sizing: Runner<typeof sizingInput> = {
  addon: "riset_pro",
  input: sizingInput,
  async run(ctx, input) {
    const area = input.area || "Indonesia";
    const brief = lines([
      `Produk/kategori: ${input.product}`,
      input.business && `Bisnis user: ${input.business}`,
      `Wilayah: ${area}`,
      input.target && `Target pembeli: ${input.target}`,
      input.price && `Harga rata-rata: ${input.price}`,
      bizLine(input.model),
      input.goal && `Tujuan riset: ${input.goal}`,
    ]);
    const research = await webResearch(ctx, {
      system: `${CONSULTANT}
Tugasmu: kumpulkan data untuk MENGHITUNG UKURAN PASAR. Cari: nilai pasar kategori ini (Rp/USD) & pertumbuhannya (CAGR),
jumlah calon pembeli (populasi, rumah tangga, UMKM, pengguna internet/e-commerce sesuai target), frekuensi & nilai belanja,
porsi penjualan per kanal (marketplace, social commerce, modern/tradisional trade), tren konsumen & regulasi terbaru di wilayah ini.
${RESEARCH_RULES}`,
      prompt: untrusted("riset", brief),
      maxUses: 10,
    });
    const out: SizingOutput = await aiObject(ctx, {
      schema: sizingOutput,
      system: `${CONSULTANT}
Susun laporan UKURAN & TREN PASAR dari catatan riset. Aturan:
- TAM = seluruh pasar kategori di ${area}; SAM = bagian yang benar-benar bisa dilayani produk/kanal/harga user; SOM = target realistis 1-3 tahun
  (umumnya 0,5-5% SAM untuk UMKM). Wajib TAM ≥ SAM ≥ SOM. value_idr dalam Rupiah per tahun (angka penuh).
- Hitung dengan 2 cara bila bisa (top-down dari laporan industri & bottom-up: jumlah pembeli × frekuensi × harga); tuliskan langkah bottom-up.
- projection: 5 tahun mulai tahun ini, nilai SAM; base memakai cagr_pct, conservative & optimistic ±30-50% dari pertumbuhan base.
- channels total ±100%. trends 4-6, PESTEL 1-2 poin per faktor (konteks Indonesia), recommendations 3-5.
- confidence jujur: "rendah" bila banyak angka asumsi. data_gaps = apa yang perlu divalidasi (mis. survei 200 responden).
${research.webNote}`,
      prompt: `${brief}\n\nCatatan riset:\n${untrusted("catatan-riset", research.text.slice(0, 30_000))}`,
      maxOutputTokens: 9000,
    });
    // Jaga urutan TAM ≥ SAM ≥ SOM agar grafik tidak menyesatkan.
    out.sam.value_idr = Math.min(n(out.sam.value_idr), n(out.tam.value_idr));
    out.som.value_idr = Math.min(n(out.som.value_idr), out.sam.value_idr);
    out.sources = research.sources;
    if (research.webNote) out.summary = `${out.summary} ${research.webNote}`.trim();

    const proj = out.projection.slice(0, 6);
    const pptx = await makeDeck({
      title: clip(`Ukuran Pasar ${input.product}`, 90),
      subtitle: clip(`${area} · ${BIZ_MODEL_LABEL[input.model]}`, 160),
      theme: "corporate",
      cover_style: "split",
      slides: [
        { layout: "quote", kicker: "RINGKASAN", title: "Inti temuan", quote: clip(out.summary, 240) },
        {
          layout: "stats",
          kicker: "UKURAN PASAR",
          title: "TAM · SAM · SOM per tahun",
          subtitle: clip(out.market_definition, 160),
          stats: [
            { value: clip(shortRp(out.tam.value_idr), 12), label: "TAM — total pasar", note: clip(out.tam.buyers, 80) },
            { value: clip(shortRp(out.sam.value_idr), 12), label: "SAM — pasar terlayani", note: clip(out.sam.buyers, 80) },
            { value: clip(shortRp(out.som.value_idr), 12), label: "SOM — target realistis", note: clip(out.som.buyers, 80) },
            { value: clip(`${fmt(out.cagr_pct, 1)}%`, 12), label: "Pertumbuhan per tahun", note: clip(`Fase ${out.lifecycle}`, 80) },
          ],
        },
        {
          layout: "table",
          kicker: "CARA HITUNG",
          title: "Hitungan bottom-up",
          table: { headers: ["Langkah", "Angka", "Sumber/asumsi"], rows: out.bottom_up.slice(0, 7).map((b) => [clip(b.step, 60), clip(b.value, 60), clip(b.source, 60)]) },
        },
        {
          layout: "chart",
          kicker: "PROYEKSI",
          title: "Proyeksi SAM 5 tahun",
          subtitle: "Nilai dalam miliar Rupiah per tahun — 3 skenario",
          chart: {
            type: "line",
            labels: proj.map((p) => String(p.year)),
            series: [
              { name: "Konservatif", values: proj.map((p) => +(n(p.conservative) / 1e9).toFixed(2)) },
              { name: "Dasar", values: proj.map((p) => +(n(p.base) / 1e9).toFixed(2)) },
              { name: "Optimis", values: proj.map((p) => +(n(p.optimistic) / 1e9).toFixed(2)) },
            ],
            unit: "M",
          },
        },
        {
          layout: "chart",
          kicker: "KANAL",
          title: "Porsi penjualan per kanal",
          chart: { type: "doughnut", labels: out.channels.slice(0, 8).map((c) => clip(c.channel, 30)), series: [{ name: "Porsi", values: out.channels.slice(0, 8).map((c) => n(c.share_pct)) }], unit: "%" },
        },
        {
          layout: "cards",
          kicker: "TREN",
          title: "Tren yang membentuk pasar",
          cards: out.trends.slice(0, 6).map((t) => ({ icon: t.impact === "peluang" ? "trending-up" : "flag", title: clip(t.title, 40), text: clip(t.detail, 160) })),
        },
        {
          layout: "table",
          kicker: "PESTEL",
          title: "Analisis PESTEL",
          table: { headers: ["Faktor", "Poin", "Dampak"], rows: out.pestel.slice(0, 7).map((p) => [p.factor, clip(p.point, 60), p.impact]) },
        },
        {
          layout: "comparison",
          kicker: "PENDORONG & PENGHAMBAT",
          title: "Apa yang mendorong & menahan pasar",
          columns: [
            { heading: "Penghambat", bullets: out.barriers.slice(0, 5).map((b) => clip(b, 110)) },
            { heading: "Pendorong", bullets: out.drivers.slice(0, 5).map((b) => clip(b, 110)) },
          ],
        },
        {
          layout: "timeline",
          kicker: "REKOMENDASI",
          title: "Langkah berikutnya",
          steps: padSteps(out.recommendations.map((r) => ({ title: clip(r.title, 40), text: clip(r.detail, 120) }))),
        },
        sourcesSlide(research.sources),
      ],
    });
    const xlsx = await makeWorkbook(withNotes(ctx, [
      {
        name: "Ukuran pasar",
        title: `Ukuran pasar ${input.product} — ${area}`,
        columns: [
          { header: "Level", key: "level", width: 12 },
          { header: "Nilai per tahun", key: "value", width: 22, money: true },
          { header: "Pembeli/unit", key: "buyers", width: 30 },
          { header: "Definisi", key: "definition", width: 50 },
          { header: "Cara hitung", key: "formula", width: 60 },
        ],
        rows: (["tam", "sam", "som"] as const).map((k) => ({ level: k.toUpperCase(), value: out[k].value_idr, buyers: out[k].buyers, definition: out[k].definition, formula: out[k].formula })),
      },
      {
        name: "Bottom-up",
        columns: [
          { header: "Langkah", key: "step", width: 44 },
          { header: "Angka", key: "value", width: 26 },
          { header: "Sumber/asumsi", key: "source", width: 50 },
        ],
        rows: out.bottom_up,
      },
      {
        name: "Proyeksi",
        title: `Proyeksi SAM (CAGR dasar ${fmt(out.cagr_pct, 1)}%)`,
        columns: [
          { header: "Tahun", key: "year", width: 10 },
          { header: "Konservatif", key: "conservative", width: 22, money: true },
          { header: "Dasar", key: "base", width: 22, money: true },
          { header: "Optimis", key: "optimistic", width: 22, money: true },
        ],
        rows: proj,
      },
      {
        name: "Tren & PESTEL",
        columns: [
          { header: "Jenis", key: "kind", width: 14 },
          { header: "Judul/faktor", key: "title", width: 30 },
          { header: "Detail", key: "detail", width: 70 },
          { header: "Dampak", key: "impact", width: 12 },
        ],
        rows: [
          ...out.trends.map((t) => ({ kind: "Tren", title: t.title, detail: t.detail, impact: t.impact })),
          ...out.pestel.map((p) => ({ kind: "PESTEL", title: p.factor, detail: p.point, impact: p.impact })),
          ...out.drivers.map((d) => ({ kind: "Pendorong", title: "", detail: d, impact: "positif" })),
          ...out.barriers.map((d) => ({ kind: "Penghambat", title: "", detail: d, impact: "negatif" })),
        ],
        rowColor: (r) => (r.impact === "positif" || r.impact === "peluang" ? "E8F8EF" : r.impact === "negatif" || r.impact === "ancaman" ? "FDECEC" : null),
      },
      sourcesSheet(research.sources),
    ]));
    const slug = fileSlug(input.product);
    const files = await store([
      storeMaybe(ctx, `ukuran-pasar-${slug}.pptx`, "pptx", pptx, "PPT laporan pasar"),
      storeToolFile(ctx, `ukuran-pasar-${slug}.xlsx`, "xlsx", xlsx, "Excel model pasar"),
    ]);
    return { title: `Ukuran pasar — ${input.product}`, output: out, files };
  },
};

// ============================================================ Segmentasi & Persona

const persona: Runner<typeof personaInput> = {
  addon: "riset_pro",
  input: personaInput,
  async run(ctx, input) {
    const area = input.area || "Indonesia";
    const brief = lines([
      `Produk/kategori: ${input.product}`,
      input.brand && `Brand: ${input.brand}`,
      `Wilayah: ${area}`,
      input.price && `Harga: ${input.price}`,
      bizLine(input.model),
      input.known && `Yang sudah diketahui tentang pelanggan: ${input.known}`,
      input.goal && `Tujuan riset: ${input.goal}`,
    ]);
    const research = await webResearch(ctx, {
      system: `${CONSULTANT}
Tugasmu: riset PERILAKU KONSUMEN kategori ini. Cari hasil survei/studi (Jakpat, Populix, Katadata Insight, Kantar, Nielsen, Google, TikTok,
Meta, marketplace) tentang: siapa pembelinya (usia, gender, SES, kota), alasan & pemicu membeli, faktor pertimbangan (harga, kualitas,
review, promo, halal, dsb.), kanal penemuan & pembelian, frekuensi, keluhan umum, serta ulasan pembeli di marketplace/sosmed.
${RESEARCH_RULES}`,
      prompt: untrusted("riset", brief),
      maxUses: 8,
    });
    const out: PersonaOutput = await aiObject(ctx, {
      schema: personaOutput,
      system: `${CONSULTANT}
Susun laporan SEGMENTASI & PERSONA dari catatan riset. Aturan:
- segments 3-5 (berdasarkan kebutuhan & perilaku, bukan hanya demografi); share_pct total ±100; attractiveness & ease 1-10 jujur.
- personas 2-4 yang hidup dan khas Indonesia (nama, kota, pekerjaan, penghasilan realistis), masing-masing 3-4 goals/pains/jobs/triggers/objections.
- journey 5 tahap untuk persona prioritas, dengan touchpoint nyata (TikTok, IG, Shopee, WhatsApp, toko, dsb.).
- drivers 6-8 faktor keputusan beli dengan bobot 1-10. insights 3-5: insight = kebenaran manusiawi yang tidak terlihat jelas, evidence = data/temuan, implication = artinya untuk marketing.
- recommendations 3-5 yang bisa langsung dieksekusi. ${research.webNote}`,
      prompt: `${brief}\n\nCatatan riset:\n${untrusted("catatan-riset", research.text.slice(0, 30_000))}`,
      maxOutputTokens: 10000,
    });
    out.sources = research.sources;
    if (research.webNote) out.summary = `${out.summary} ${research.webNote}`.trim();

    const drivers = [...out.drivers].sort((a, b) => n(b.importance) - n(a.importance)).slice(0, 8);
    const pptx = await makeDeck({
      title: clip(`Persona Konsumen ${input.brand || input.product}`, 90),
      subtitle: clip(`${input.product} · ${area}`, 160),
      theme: "coral",
      cover_style: "split",
      slides: [
        { layout: "quote", kicker: "RINGKASAN", title: "Inti temuan", quote: clip(out.summary, 240) },
        {
          layout: "table",
          kicker: "SEGMENTASI",
          title: "Segmen pasar",
          subtitle: clip(out.priority_segment, 160),
          table: {
            headers: ["Segmen", "Porsi", "Daya tarik", "Mudah dimenangkan"],
            rows: out.segments.slice(0, 7).map((s) => [clip(s.name, 60), `${fmt(s.share_pct, 0)}%`, `${fmt(s.attractiveness, 0)}/10`, `${fmt(s.ease, 0)}/10`]),
          },
        },
        ...out.personas.slice(0, 4).map((p) => ({
          layout: "comparison" as const,
          kicker: clip(`PERSONA · ${p.segment}`, 40),
          title: clip(p.name, 90),
          subtitle: clip(`${p.age} · ${p.occupation} · ${p.location} — “${p.quote}”`, 160),
          columns: [
            { heading: "Masalah & keberatan", bullets: [...p.pains.slice(0, 3), ...p.objections.slice(0, 2)].map((x) => clip(x, 110)) },
            { heading: "Tujuan & pemicu beli", bullets: [...p.goals.slice(0, 3), ...p.triggers.slice(0, 2)].map((x) => clip(x, 110)) },
          ],
        })),
        {
          layout: "timeline",
          kicker: "CUSTOMER JOURNEY",
          title: "Perjalanan pembeli",
          steps: padSteps(out.journey.map((j) => ({ title: clip(j.stage, 40), text: clip(j.opportunity, 120) }))),
        },
        {
          layout: "chart",
          kicker: "KEPUTUSAN BELI",
          title: "Faktor yang paling menentukan",
          chart: { type: "bar", labels: drivers.map((d) => clip(d.factor, 30)), series: [{ name: "Bobot (1-10)", values: drivers.map((d) => n(d.importance)) }] },
        },
        {
          layout: "cards",
          kicker: "INSIGHT",
          title: "Consumer insight",
          cards: out.insights.slice(0, 6).map((i) => ({ icon: "lightbulb", title: clip(i.insight, 40), text: clip(i.implication, 160) })),
        },
        {
          layout: "timeline",
          kicker: "REKOMENDASI",
          title: "Langkah berikutnya",
          steps: padSteps(out.recommendations.map((r) => ({ title: clip(r.title, 40), text: clip(r.detail, 120) }))),
        },
        sourcesSlide(research.sources),
      ],
    });
    const xlsx = await makeWorkbook(withNotes(ctx, [
      {
        name: "Segmen",
        columns: [
          { header: "Segmen", key: "name", width: 26 },
          { header: "Deskripsi", key: "description", width: 50 },
          { header: "Porsi (%)", key: "share_pct", width: 10 },
          { header: "Daya tarik", key: "attractiveness", width: 11 },
          { header: "Mudah dimenangkan", key: "ease", width: 12 },
          { header: "Alasan", key: "why", width: 50 },
        ],
        rows: out.segments,
      },
      {
        name: "Persona",
        columns: [
          { header: "Persona", key: "name", width: 26 },
          { header: "Segmen", key: "segment", width: 20 },
          { header: "Profil", key: "profile", width: 36 },
          { header: "Kutipan", key: "quote", width: 40 },
          { header: "Tujuan", key: "goals", width: 40 },
          { header: "Masalah", key: "pains", width: 40 },
          { header: "Jobs-to-be-done", key: "jobs", width: 44 },
          { header: "Pemicu beli", key: "triggers", width: 36 },
          { header: "Keberatan", key: "objections", width: 36 },
          { header: "Kanal", key: "channels", width: 24 },
          { header: "Pesan kunci", key: "message", width: 44 },
        ],
        rows: out.personas.map((p) => ({
          ...p,
          profile: `${p.age} · ${p.occupation} · ${p.income} · ${p.location}`,
          goals: p.goals.join("\n"),
          pains: p.pains.join("\n"),
          jobs: p.jobs.join("\n"),
          triggers: p.triggers.join("\n"),
          objections: p.objections.join("\n"),
          channels: p.channels.join(", "),
        })),
      },
      {
        name: "Customer journey",
        columns: [
          { header: "Tahap", key: "stage", width: 18 },
          { header: "Yang dilakukan", key: "doing", width: 40 },
          { header: "Yang dipikirkan", key: "thinking", width: 40 },
          { header: "Touchpoint", key: "touchpoints", width: 28 },
          { header: "Hambatan", key: "pain", width: 36 },
          { header: "Peluang", key: "opportunity", width: 44 },
        ],
        rows: out.journey.map((j) => ({ ...j, touchpoints: j.touchpoints.join(", ") })),
      },
      {
        name: "Insight",
        columns: [
          { header: "Insight", key: "insight", width: 50 },
          { header: "Bukti", key: "evidence", width: 50 },
          { header: "Implikasi", key: "implication", width: 50 },
        ],
        rows: out.insights,
      },
      sourcesSheet(research.sources),
    ]));
    const slug = fileSlug(input.brand || input.product);
    const files = await store([
      storeMaybe(ctx, `persona-${slug}.pptx`, "pptx", pptx, "PPT persona & segmen"),
      storeToolFile(ctx, `persona-${slug}.xlsx`, "xlsx", xlsx, "Excel persona"),
    ]);
    return { title: `Persona konsumen — ${input.brand || input.product}`, output: out, files };
  },
};

// ============================================================ Kelayakan & Strategi Masuk Pasar

const VERDICT_LABEL: Record<EntryOutput["verdict"], string> = { go: "LAYAK — jalan", go_bersyarat: "LAYAK BERSYARAT", tunda: "TUNDA dulu", no_go: "TIDAK LAYAK" };

const entry: Runner<typeof entryInput> = {
  addon: "riset_pro",
  input: entryInput,
  async run(ctx, input) {
    const area = input.area || "Indonesia";
    const brief = lines([
      `Rencana bisnis/produk: ${input.idea}`,
      input.brand && `Brand: ${input.brand}`,
      `Wilayah: ${area}`,
      bizLine(input.model),
      input.price && `Rencana harga: ${input.price}`,
      input.budget && `Modal/budget: ${input.budget}`,
      input.assets && `Kekuatan/aset yang dimiliki: ${input.assets}`,
    ]);
    const research = await webResearch(ctx, {
      system: `${CONSULTANT}
Tugasmu: riset untuk STUDI KELAYAKAN masuk pasar. Cari: pemain utama & pangsa pasarnya, kisaran harga pasar, margin umum industri,
biaya bahan/produksi, hambatan masuk, izin & regulasi Indonesia yang berlaku untuk produk ini (OSS/NIB, PIRT, BPOM, sertifikat halal BPJPH,
SNI, merek DJKI, pajak), estimasi waktu & biaya perizinan, serta risiko (bahan baku, kurs, regulasi, perang harga).
${RESEARCH_RULES}`,
      prompt: untrusted("riset", brief),
      maxUses: 10,
    });
    const out: EntryOutput = await aiObject(ctx, {
      schema: entryOutput,
      system: `${CONSULTANT}
Susun STUDI KELAYAKAN & STRATEGI MASUK PASAR dari catatan riset. Aturan:
- scorecard 5-7 kriteria, weight_pct total 100, score 1-10 jujur (jangan semua tinggi). verdict konsisten dengan skor:
  ≥75 go, 60-74 go_bersyarat, 45-59 tunda, <45 no_go.
- five_forces: tepat 5 entri (pesaing, pendatang_baru, produk_pengganti, kuasa_pembeli, kuasa_pemasok), 2-3 alasan tiap force.
- regulations: hanya yang relevan untuk produk ini; status "cek" bila tergantung jenis produk. Jangan menyatakan produk sudah punya izin.
- entry_modes 3-4 (mis. jualan marketplace dulu, reseller/dropship, B2B ke kafe/toko, toko offline, kolaborasi brand) + skor kecocokan.
- unit_economics per pesanan dalam Rupiah (perkiraan wajar industri). capital 4-8 pos.
- risks 4-6 dengan likelihood & impact 1-5 dan mitigasi konkret. plan 3 fase (Hari 1-30, 31-60, 61-90), kpis 4-6.
${research.webNote}`,
      prompt: `${brief}\n\nCatatan riset:\n${untrusted("catatan-riset", research.text.slice(0, 30_000))}`,
      maxOutputTokens: 10000,
    });
    // Skor kelayakan dihitung program dari scorecard (bobot dinormalkan) agar konsisten.
    const totalW = out.scorecard.reduce((s, c) => s + Math.max(0, n(c.weight_pct)), 0) || 1;
    out.weighted_score = Math.round(out.scorecard.reduce((s, c) => s + (Math.max(0, n(c.weight_pct)) / totalW) * clamp(c.score, 0, 10) * 10, 0));
    out.sources = research.sources;
    if (research.webNote) out.summary = `${out.summary} ${research.webNote}`.trim();

    const ue = out.unit_economics;
    const profit = n(ue.price) - n(ue.cogs) - n(ue.marketing) - n(ue.other);
    const capitalTotal = out.capital.reduce((s, c) => s + n(c.amount_idr), 0);
    const pptx = await makeDeck({
      title: clip(`Studi Kelayakan ${input.brand || "Bisnis"}`, 90),
      subtitle: clip(input.idea, 160),
      theme: "ocean",
      cover_style: "split",
      slides: [
        {
          layout: "stats",
          kicker: "KESIMPULAN",
          title: clip(VERDICT_LABEL[out.verdict], 90),
          subtitle: clip(out.verdict_reason, 160),
          stats: [
            { value: `${out.weighted_score}/100`, label: "Skor kelayakan" },
            { value: clip(shortRp(profit), 12), label: "Laba per pesanan (perkiraan)" },
            { value: clip(shortRp(capitalTotal), 12), label: "Modal awal (perkiraan)" },
          ],
        },
        {
          layout: "table",
          kicker: "SCORECARD",
          title: "Penilaian per kriteria",
          table: { headers: ["Kriteria", "Bobot", "Skor", "Catatan"], rows: out.scorecard.slice(0, 7).map((c) => [clip(c.criterion, 60), `${fmt(c.weight_pct, 0)}%`, `${fmt(c.score, 0)}/10`, clip(c.note, 60)]) },
        },
        {
          layout: "table",
          kicker: "PORTER'S 5 FORCES",
          title: "Peta kekuatan persaingan",
          table: { headers: ["Kekuatan", "Tingkat", "Alasan utama"], rows: out.five_forces.slice(0, 5).map((f) => [clip(FORCE_LABEL[f.force], 60), f.level, clip(f.reasons[0] ?? "-", 60)]) },
        },
        {
          layout: "table",
          kicker: "IZIN & REGULASI",
          title: "Yang perlu diurus",
          table: { headers: ["Izin", "Status", "Waktu", "Biaya"], rows: out.regulations.slice(0, 7).map((r) => [clip(r.name, 60), r.status, clip(r.time, 60), clip(r.cost, 60)]) },
        },
        {
          layout: "cards",
          kicker: "CARA MASUK PASAR",
          title: "Opsi strategi masuk",
          subtitle: clip(`Harga: ${out.pricing.strategy} (${out.pricing.price_range})`, 160),
          cards: [...out.entry_modes]
            .sort((a, b) => n(b.fit) - n(a.fit))
            .slice(0, 4)
            .map((m) => ({ icon: "compass", title: clip(`${m.mode} · ${fmt(m.fit, 0)}/10`, 40), text: clip(`+ ${m.pros} − ${m.cons}`, 160) })),
        },
        {
          layout: "chart",
          kicker: "UNIT ECONOMICS",
          title: "Ke mana uang per pesanan pergi",
          subtitle: clip(ue.note, 160),
          chart: {
            type: "bar",
            labels: ["Harga jual", "HPP", "Marketing", "Biaya lain", "Laba"],
            series: [{ name: "Rupiah", values: [n(ue.price), n(ue.cogs), n(ue.marketing), n(ue.other), profit] }],
            unit: "Rp",
          },
        },
        {
          layout: "table",
          kicker: "RISIKO",
          title: "Peta risiko & mitigasi",
          table: {
            headers: ["Risiko", "Peluang", "Dampak", "Mitigasi"],
            rows: [...out.risks]
              .sort((a, b) => n(b.likelihood) * n(b.impact) - n(a.likelihood) * n(a.impact))
              .slice(0, 7)
              .map((r) => [clip(r.risk, 60), `${fmt(r.likelihood, 0)}/5`, `${fmt(r.impact, 0)}/5`, clip(r.mitigation, 60)]),
          },
        },
        {
          layout: "timeline",
          kicker: "RENCANA 90 HARI",
          title: "Rencana eksekusi",
          steps: padSteps(out.plan.map((p) => ({ title: clip(p.phase, 40), text: clip(`${p.focus}: ${p.actions.slice(0, 2).join("; ")}`, 120) }))),
        },
        sourcesSlide(research.sources),
      ],
    });
    const xlsx = await makeWorkbook(withNotes(ctx, [
      {
        name: "Scorecard",
        title: `Skor kelayakan: ${out.weighted_score}/100 — ${VERDICT_LABEL[out.verdict]}`,
        columns: [
          { header: "Kriteria", key: "criterion", width: 30 },
          { header: "Bobot (%)", key: "weight_pct", width: 10 },
          { header: "Skor (1-10)", key: "score", width: 11 },
          { header: "Catatan", key: "note", width: 70 },
        ],
        rows: out.scorecard,
      },
      {
        name: "5 Forces",
        columns: [
          { header: "Kekuatan", key: "force", width: 30 },
          { header: "Tingkat", key: "level", width: 10 },
          { header: "Alasan", key: "reasons", width: 80 },
        ],
        rows: out.five_forces.map((f) => ({ force: FORCE_LABEL[f.force], level: f.level, reasons: f.reasons.join("\n") })),
        rowColor: (r) => (r.level === "tinggi" ? "FDECEC" : r.level === "rendah" ? "E8F8EF" : "FFF7E0"),
      },
      {
        name: "Izin & regulasi",
        columns: [
          { header: "Izin", key: "name", width: 26 },
          { header: "Status", key: "status", width: 12 },
          { header: "Detail", key: "detail", width: 60 },
          { header: "Waktu", key: "time", width: 18 },
          { header: "Biaya", key: "cost", width: 20 },
        ],
        rows: out.regulations,
      },
      {
        name: "Unit economics & modal",
        columns: [
          { header: "Pos", key: "item", width: 36 },
          { header: "Rupiah", key: "amount", width: 20, money: true },
        ],
        rows: [
          { item: "Harga jual per pesanan", amount: n(ue.price) },
          { item: "HPP", amount: n(ue.cogs) },
          { item: "Marketing per pesanan", amount: n(ue.marketing) },
          { item: "Biaya lain per pesanan", amount: n(ue.other) },
          { item: "LABA PER PESANAN", amount: profit },
          { item: "", amount: null },
          ...out.capital.map((c) => ({ item: `Modal: ${c.item}`, amount: n(c.amount_idr) })),
          { item: "TOTAL MODAL AWAL", amount: capitalTotal },
        ],
      },
      {
        name: "Risiko",
        columns: [
          { header: "Risiko", key: "risk", width: 40 },
          { header: "Peluang (1-5)", key: "likelihood", width: 12 },
          { header: "Dampak (1-5)", key: "impact", width: 12 },
          { header: "Mitigasi", key: "mitigation", width: 60 },
        ],
        rows: out.risks,
        rowColor: (r) => (n(r.likelihood) * n(r.impact) >= 12 ? "FDECEC" : n(r.likelihood) * n(r.impact) >= 6 ? "FFF7E0" : null),
      },
      {
        name: "Rencana 90 hari",
        columns: [
          { header: "Fase", key: "phase", width: 16 },
          { header: "Fokus", key: "focus", width: 30 },
          { header: "Aksi", key: "actions", width: 70 },
          { header: "KPI", key: "kpi", width: 36 },
        ],
        rows: out.plan.map((p) => ({ ...p, actions: p.actions.join("\n") })),
      },
      sourcesSheet(research.sources),
    ]));
    const slug = fileSlug(input.brand || input.idea);
    const files = await store([
      storeMaybe(ctx, `studi-kelayakan-${slug}.pptx`, "pptx", pptx, "PPT studi kelayakan"),
      storeToolFile(ctx, `studi-kelayakan-${slug}.xlsx`, "xlsx", xlsx, "Excel studi kelayakan"),
    ]);
    return { title: `Studi kelayakan — ${input.brand || clip(input.idea, 40)}`, output: out, files };
  },
};

// ============================================================ Desain Survei & Kuesioner

const survey: Runner<typeof surveyInput> = {
  addon: "riset_pro",
  input: surveyInput,
  async run(ctx, input) {
    const sample = sampleSize(input.margin, input.population);
    const out: SurveyOutput = await aiObject(ctx, {
      schema: surveyOutput,
      system: `${CONSULTANT}
Kamu research director lembaga riset (standar ESOMAR, gaya kuesioner Nielsen/Kantar/Jakpat). Rancang survei yang valid & siap disebar. Aturan:
- Panjang: ${SURVEY_LENGTH[input.length]}. Bahasa sederhana, satu hal per pertanyaan, tidak menggiring, pilihan jawaban lengkap & tidak tumpang tindih
  (tambahkan "Lainnya" / "Tidak tahu" bila perlu). Urutan: umum → spesifik; data demografi di akhir.
- screener 2-4 pertanyaan untuk menyaring responden yang sesuai target (tulis jawaban yang lolos/terminate).
- Untuk topik harga gunakan Van Westendorp (4 pertanyaan: terlalu murah, murah, mahal, terlalu mahal). Untuk kepuasan gunakan NPS 0-10 + alasan.
  Untuk awareness: top of mind (terbuka) → spontan → dibantu. Untuk uji konsep: minat beli skala 1-5 (top-2-box).
- code berurutan Q1, Q2, … di seluruh section; options kosong untuk terbuka/angka/nps.
- quotas: pembagian responden per kelompok penting (usia/kota/pengguna vs bukan), total 100.
- analysis: tiap tujuan → pertanyaan mana → metode (crosstab, top-2-box, NPS, Van Westendorp, ranking) → output tabel/grafik.
- fieldwork 4-6 tips praktis (cara sebar: grup WA, IG story, Jakpat/Populix bila butuh panel; cek kualitas: attention check, durasi minimum).`,
      prompt: untrusted(
        "survei",
        lines([
          `Tujuan riset: ${input.objective}`,
          input.product && `Produk/brand: ${input.product}`,
          `Target responden: ${input.respondents}`,
          `Topik: ${input.topics.map((tp) => SURVEY_TOPIC_LABEL[tp]).join(", ")}`,
          `Metode: ${input.method.replace("_", " ")}`,
          `Jumlah responden yang direncanakan: ${sample.recommended}`,
        ]),
      ),
      maxOutputTokens: 10000,
    });
    // Nomor pertanyaan dirapikan program agar konsisten.
    let q = 0;
    for (const s of out.sections) for (const item of s.questions) item.code = `Q${++q}`;
    out.sample = sample;

    const xlsx = await makeWorkbook(withNotes(ctx, [
      {
        name: "Kuesioner",
        title: out.title,
        columns: [
          { header: "Bagian", key: "section", width: 22 },
          { header: "Kode", key: "code", width: 7 },
          { header: "Pertanyaan", key: "text", width: 60 },
          { header: "Jenis jawaban", key: "type", width: 20 },
          { header: "Pilihan jawaban (salin ke Google Form)", key: "options", width: 50 },
          { header: "Wajib", key: "required", width: 8 },
          { header: "Logika / catatan", key: "note", width: 36 },
        ],
        rows: [
          ...out.screener.map((s, i) => ({ section: "Screener", code: `S${i + 1}`, text: s.text, type: "Pilihan tunggal", options: s.options.join("\n"), required: "Ya", note: s.qualify })),
          ...out.sections.flatMap((s) =>
            s.questions.map((item) => ({
              section: s.title,
              code: item.code,
              text: item.text,
              type: QUESTION_TYPE_LABEL[item.type],
              options: item.type === "nps" ? "0 … 10" : item.type === "likert" && !item.options.length ? "1 Sangat tidak setuju … 5 Sangat setuju" : item.options.join("\n"),
              required: item.type === "terbuka" ? "Tidak" : "Ya",
              note: item.note,
            })),
          ),
        ],
        rowColor: (r) => (r.section === "Screener" ? "F1EEFF" : null),
      },
      {
        name: "Sampel & kuota",
        title: `Minimal ${sample.n} responden (margin ±${sample.margin}%, keyakinan ${sample.confidence}%) — disarankan ${sample.recommended}`,
        columns: [
          { header: "Kelompok", key: "group", width: 34 },
          { header: "Porsi (%)", key: "share_pct", width: 12 },
          { header: "Jumlah responden", key: "count", width: 18 },
        ],
        rows: out.quotas.map((k) => ({ ...k, count: Math.ceil((n(k.share_pct) / 100) * sample.recommended) })),
      },
      {
        name: "Rencana analisis",
        columns: [
          { header: "Tujuan", key: "objective", width: 40 },
          { header: "Pertanyaan", key: "questions", width: 16 },
          { header: "Metode", key: "method", width: 44 },
          { header: "Output", key: "output", width: 44 },
        ],
        rows: out.analysis,
      },
      {
        name: "Panduan lapangan",
        columns: [
          { header: "Bagian", key: "kind", width: 18 },
          { header: "Isi", key: "text", width: 100 },
        ],
        rows: [
          { kind: "Pembuka", text: out.intro },
          { kind: "Insentif", text: out.incentive },
          ...out.objectives.map((t) => ({ kind: "Tujuan", text: t })),
          ...out.hypotheses.map((t) => ({ kind: "Hipotesis", text: t })),
          ...out.fieldwork.map((t) => ({ kind: "Tips lapangan", text: t })),
        ],
      },
    ]));
    const files = await store([storeToolFile(ctx, `kuesioner-${fileSlug(out.title || input.objective)}.xlsx`, "xlsx", xlsx, "Excel kuesioner (siap Google Form)")]);
    return { title: clip(out.title || "Desain survei", 80), output: out, files };
  },
};

export const RESEARCH_RUNNERS = {
  sizing: sizing as Runner<z.ZodTypeAny>,
  persona: persona as Runner<z.ZodTypeAny>,
  entry: entry as Runner<z.ZodTypeAny>,
  survey: survey as Runner<z.ZodTypeAny>,
};
