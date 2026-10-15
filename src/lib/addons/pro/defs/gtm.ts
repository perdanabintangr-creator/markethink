import "server-only";
import { clip, fileSlug } from "../../runtime";
import { makeRunner, type ProDef } from "../kit";
import { GTM_PHASE_LABEL, TEAM_LABEL, gtmForm, gtmOutput, parseLaunchDate, weekLabel, weekStart } from "../specs/gtm";
import { idr, normalize100, parseRupiah, splitAmount } from "../specs/plan";

const PHASE_ORDER = { pre: 0, launch: 1, post: 2 } as const;
const TEAM_ORDER = { marketing: 0, sales: 1, operasional: 2, cs: 3 } as const;
const PRIORITY_ORDER = { utama: 0, kedua: 1, nanti: 2 } as const;
const LEVEL = { tinggi: 0, sedang: 1, rendah: 2 } as const;
const minutes = (t: string) => {
  const m = t.match(/(\d{1,2})[.:](\d{2})/);
  return m ? +m[1] * 60 + +m[2] : 9999;
};

export const gtmDef: ProDef<typeof gtmOutput> = {
  tool: "gtm",
  addon: "strategi_pro",
  form: gtmForm,
  output: gtmOutput,
  maxOutputTokens: 16000,
  role: `Kamu Product Marketing Lead yang sudah meluncurkan puluhan produk di Indonesia — dari brand D2C di TikTok Shop & Shopee sampai produk
yang masuk ritel modern. Kamu tahu peluncuran gagal biasanya karena hal operasional (stok, CS kewalahan, link rusak, KOL telat posting),
jadi rencana GTM-mu selalu sampai level checklist tim dan runbook jam per jam di hari-H.`,
  rules: (input) => {
    const launch = parseLaunchDate(input.launch_date);
    return `- Tanggal launching: ${input.launch_date ? String(input.launch_date) : "belum ditentukan — asumsikan ±5-6 minggu dari hari ini dan tulis sebagai asumsi"}.${launch ? " Minggu 0 = minggu yang memuat tanggal itu." : ""}
- value proposition canvas: jobs/pains/gains dari sudut pandang pembeli (bahasa mereka), lalu products, pain relievers & gain creators yang
  berpasangan langsung (pain ke-1 ↔ reliever ke-1, dst.). Jangan menulis manfaat yang tidak didukung produk.
- icp: 2-3 segmen, TEPAT 1 "utama" — yang paling cepat membeli (masalah paling terasa, mudah dijangkau, daya beli cocok). Sebut momen pemicu beli & di mana mereka belanja.
- positioning: format "Untuk … yang …, [produk] adalah … yang … karena …"; versus = alasan jujur memilih kita dibanding alternatif${input.competitors ? ` (${input.competitors})` : ""}.
- pricing: ${input.price ? `evaluasi rencana harga user (${input.price}); ` : ""}rekomendasikan harga normal (angka bulat psikologis: 79.000, 89.900, 149.000) berdasarkan
  posisi vs kompetitor dan margin. Bila HPP disebut, hitung margin kotor & batas diskon aman (diskon tidak boleh membuat margin < ±30% untuk D2C).
  Tier 2-3 (mis. satuan, bundle hemat, paket hadiah) dengan peran jelas. Penawaran perkenalan harus terbatas waktu/kuota agar tidak merusak harga normal.
- channels: peran tiap kanal di fase mana + taktik spesifik (mis. TikTok: 20 video KOL nano H-7 s/d H+7 dengan kode voucher; live launch 3 jam).
- phases: tepat 3 — pre (bangun antisipasi, waiting list/pre-order, seeding KOL, siapkan ulasan), launch (ledakan 3-7 hari, live, penawaran perdana),
  post (bukti sosial, ulasan, retargeting, repeat). Tiap fase: durasi, tujuan, 3-6 aktivitas, 2-3 KPI.
- timeline: per minggu dari ±-4 sampai ±+6 (week = angka relatif, 0 = minggu launch), aktivitas spesifik + PIC.
- checklist: per tim (marketing, sales, operasional, cs), 3-5 tugas tiap tim dengan tenggat H-x. Wajib ada: stok & packing, listing marketplace
  (foto, deskripsi, variasi, voucher), template jawaban CS & FAQ, tes alur order/pembayaran, brief & jadwal KOL, tracking link/UTM.
- runbook hari-H: 8-14 baris dari pagi sampai malam (format HH.MM), siapa, dan rencana cadangan bila ada yang gagal.
- kpis: target realistis untuk peluncuran (unit terjual, ulasan bintang ≥4,8, repeat 30 hari, ROAS), dengan waktu ukur.
- budget: pos (KOL/affiliate, iklan per platform, sampel/seeding, produksi konten, voucher perkenalan, cadangan). total dari isian user (Rupiah penuh);
  bila kosong rekomendasikan dan basis "rekomendasi". Nominal per pos dihitung sistem.
- risks: risiko peluncuran nyata (stok habis/kelebihan, ulasan negatif awal, KOL telat, kompetitor banting harga, gagal bayar/COD retur) + mitigasi.`;
  },
  post(out, input) {
    out.icp = [...out.icp].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    out.phases = [...out.phases].sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]);
    out.timeline = out.timeline.map((x) => ({ ...x, week: Math.round(Number(x.week) || 0) })).sort((a, b) => a.week - b.week);
    out.checklist = [...out.checklist].sort((a, b) => TEAM_ORDER[a.team] - TEAM_ORDER[b.team]);
    out.runbook = [...out.runbook].sort((a, b) => minutes(a.time) - minutes(b.time));
    out.risks = [...out.risks].sort((a, b) => LEVEL[a.likelihood] - LEVEL[b.likelihood]);
    const round = (n: number | null) => (n !== null && Number.isFinite(n) && n > 0 ? Math.round(n) : null);
    out.pricing.recommended = round(out.pricing.recommended);
    out.pricing.tiers = out.pricing.tiers.map((x) => ({ ...x, price: round(x.price) }));
    const raw = String(input.budget ?? "").trim();
    const parsed = parseRupiah(raw);
    if (parsed) out.budget.total = parsed.amount;
    out.budget.basis = raw ? "user" : "rekomendasi";
    if (out.budget.total !== null && !(out.budget.total > 0)) out.budget.total = null;
    const pcts = normalize100(out.budget.items.map((b) => Number(b.pct) || 0));
    const amounts = splitAmount(out.budget.total, pcts);
    out.budget.items = out.budget.items.map((b, i) => ({ ...b, pct: pcts[i], amount: amounts[i] })).sort((a, b) => b.pct - a.pct);
  },
  title: (_out, input) => `Rencana peluncuran ${clip(String(input.product).split(/[,.\n]/)[0], 60)}${input.brand ? ` — ${input.brand}` : ""}`,
  files(out, input) {
    const brand = String(input.brand || "Produk baru");
    const launch = parseLaunchDate(input.launch_date);
    const when = (w: number) => (launch ? `${weekLabel(w)} (${weekStart(launch, w)})` : weekLabel(w));
    const p = out.pricing;
    const c = out.canvas;
    const budgetLabel = out.budget.total !== null ? `${idr(out.budget.total)}${out.budget.basis === "rekomendasi" ? " (rekomendasi)" : ""}` : "-";
    const primary = out.icp[0];
    const weeks = compactTimeline(out.timeline, when);
    return {
      name: `gtm-${fileSlug(brand)}-${fileSlug(String(input.product).split(/[,.\n]/)[0])}`,
      deckLabel: "PPT rencana peluncuran",
      sheetLabel: "Excel timeline & checklist",
      deck: {
        title: clip("Rencana Peluncuran Produk", 90),
        subtitle: clip(`${brand}${input.launch_date ? ` · Launch ${input.launch_date}` : ""}`, 160),
        theme: "midnight",
        cover_style: "split",
        slides: [
          { layout: "quote", kicker: "RINGKASAN", title: clip(out.headline, 90), quote: clip(out.summary, 240) },
          {
            layout: "comparison",
            kicker: "VALUE PROPOSITION",
            title: "Masalah pembeli → jawaban kita",
            columns: [
              { heading: "Pembeli ingin & mengeluh", bullets: [...c.jobs.slice(0, 2), ...c.pains.slice(0, 3)].map((x) => clip(x, 110)) },
              { heading: "Produk kita menjawab", bullets: [...c.products.slice(0, 2), ...c.relievers.slice(0, 3)].map((x) => clip(x, 110)) },
            ],
          },
          {
            layout: "cards",
            kicker: "SEGMEN PRIORITAS",
            title: primary ? clip(`Mulai dari: ${primary.name}`, 90) : "Segmen prioritas",
            cards: out.icp.slice(0, 3).map((s, i) => ({ icon: ["target", "users", "user-check"][i % 3], title: clip(`${s.name} (${s.priority})`, 40), text: clip(`${s.profile} Pemicu: ${s.trigger}`, 160) })),
          },
          { layout: "quote", kicker: "POSITIONING", title: "Posisi produk", quote: clip(out.positioning.statement, 240) },
          {
            layout: "stats",
            kicker: "STRATEGI HARGA",
            title: clip(p.recommended !== null ? `Harga normal ${idr(p.recommended)}` : "Strategi harga", 90),
            subtitle: clip(p.rationale, 160),
            stats: p.tiers.slice(0, 4).map((x) => ({ value: clip(idr(x.price), 12), label: clip(x.name, 60), note: clip(x.role, 80) })),
            bullets: [clip(`Perkenalan: ${p.intro_offer}`, 140)],
          },
          {
            layout: "table",
            kicker: "STRATEGI KANAL",
            title: "Peran tiap kanal",
            table: {
              headers: ["Kanal", "Peran", "Taktik utama", "Fase", "KPI"],
              rows: out.channels.slice(0, 7).map((x) => [clip(x.channel, 60), clip(x.role, 60), clip(x.tactics[0] ?? "", 60), x.phase === "semua" ? "Semua" : GTM_PHASE_LABEL[x.phase], clip(x.kpi, 60)]),
            },
          },
          {
            layout: "timeline",
            kicker: "FASE PELUNCURAN",
            title: "Pre-launch → Launch → Post-launch",
            steps: out.phases.slice(0, 6).map((x) => ({ title: clip(`${GTM_PHASE_LABEL[x.phase]} · ${x.duration}`, 40), text: clip(`${x.goal}. KPI: ${x.kpis.join(", ")}`, 120) })),
          },
          ...[0, 7]
            .map((start) => weeks.slice(start, start + 7))
            .filter((rows) => rows.length)
            .map((rows, i) => ({
              layout: "table" as const,
              kicker: "TIMELINE",
              title: weeks.length > 7 ? `Rencana per minggu (${i + 1}/2)` : "Rencana per minggu",
              table: { headers: ["Minggu", "Aktivitas", "PIC"], rows },
            })),
          {
            layout: "cards",
            kicker: "CHECKLIST TIM",
            title: "Siapa menyiapkan apa",
            cards: (["marketing", "sales", "operasional", "cs"] as const)
              .map((team, i) => ({ team, i, items: out.checklist.filter((x) => x.team === team) }))
              .filter((g) => g.items.length)
              .map((g) => ({ icon: ["megaphone", "shopping-cart", "package", "message-circle"][g.i], title: TEAM_LABEL[g.team], text: clip(g.items.map((x) => `${x.task} (${x.due})`).join(" · "), 160) })),
          },
          {
            layout: "table",
            kicker: "HARI-H",
            title: "Runbook hari peluncuran",
            table: {
              headers: ["Jam", "Aktivitas", "PIC", "Cadangan"],
              rows: out.runbook.slice(0, 7).map((x) => [x.time, clip(x.activity, 60), clip(x.owner, 60), clip(x.note, 60)]),
            },
          },
          {
            layout: "chart",
            kicker: "BUDGET",
            title: clip(`Budget peluncuran ${budgetLabel}`, 90),
            subtitle: clip(out.budget.items.map((b) => `${b.item} ${idr(b.amount)}`).join(" · "), 160),
            chart: { type: "doughnut", labels: out.budget.items.slice(0, 12).map((b) => clip(b.item, 30)), series: [{ name: "Porsi", values: out.budget.items.slice(0, 12).map((b) => b.pct) }], unit: "%" },
          },
          {
            layout: "table",
            kicker: "KPI & RISIKO",
            title: "Target & yang harus diwaspadai",
            table: {
              headers: ["KPI", "Target", "Kapan"],
              rows: out.kpis.slice(0, 7).map((k) => [clip(k.metric, 60), clip(k.target, 60), clip(k.when, 60)]),
            },
          },
          {
            layout: "closing",
            kicker: "RISIKO",
            title: "Risiko & mitigasi",
            bullets: out.risks.slice(0, 5).map((r) => clip(`${r.risk} → ${r.mitigation}`, 140)),
          },
        ],
      },
      sheets: [
        {
          name: "Timeline",
          title: `Timeline peluncuran — ${brand}${input.launch_date ? ` (launch ${input.launch_date})` : ""}`,
          columns: [
            { header: "Minggu ke-", key: "week", width: 11 },
            { header: "Keterangan", key: "label", width: 24 },
            { header: "Fase", key: "phase", width: 13 },
            { header: "Aktivitas", key: "activity", width: 64 },
            { header: "PIC", key: "owner", width: 20 },
            { header: "Status", key: "status", width: 12 },
          ],
          rows: out.timeline.map((x) => ({ ...x, label: when(x.week), phase: GTM_PHASE_LABEL[x.week < 0 ? "pre" : x.week === 0 ? "launch" : "post"], status: "Belum" })),
          rowColor: (r) => (r.week === 0 ? "FFF7E0" : null),
        },
        {
          name: "Checklist tim",
          columns: [
            { header: "Tim", key: "team", width: 18 },
            { header: "Tugas", key: "task", width: 64 },
            { header: "Tenggat", key: "due", width: 12 },
            { header: "PIC", key: "pic", width: 16 },
            { header: "Selesai?", key: "done", width: 10 },
          ],
          rows: out.checklist.map((x) => ({ team: TEAM_LABEL[x.team], task: x.task, due: x.due, pic: "", done: "☐" })),
        },
        {
          name: "Runbook hari-H",
          columns: [
            { header: "Jam", key: "time", width: 8 },
            { header: "Aktivitas", key: "activity", width: 60 },
            { header: "PIC", key: "owner", width: 20 },
            { header: "Catatan / cadangan", key: "note", width: 50 },
          ],
          rows: out.runbook,
        },
        {
          name: "Fase & KPI",
          columns: [
            { header: "Fase / KPI", key: "a", width: 18 },
            { header: "Durasi / target", key: "b", width: 26 },
            { header: "Tujuan / kapan", key: "c", width: 44 },
            { header: "Aktivitas & KPI fase", key: "d", width: 70 },
          ],
          rows: [
            ...out.phases.map((x) => ({ a: GTM_PHASE_LABEL[x.phase], b: x.duration, c: x.goal, d: [...x.activities.map((a) => `• ${a}`), `KPI: ${x.kpis.join("; ")}`].join("\n") })),
            { a: "", b: "", c: "", d: "" },
            ...out.kpis.map((k) => ({ a: k.metric, b: k.target, c: k.when, d: "" })),
          ],
        },
        {
          name: "Harga & budget",
          title: `Harga normal ${idr(p.recommended)} · Budget ${budgetLabel}`,
          columns: [
            { header: "Item", key: "a", width: 28 },
            { header: "Harga / porsi (%)", key: "b", width: 16 },
            { header: "Nominal", key: "c", width: 16, money: true },
            { header: "Keterangan", key: "d", width: 64 },
          ],
          rows: [
            ...p.tiers.map((x) => ({ a: `Paket: ${x.name}`, b: x.role, c: x.price, d: x.contents })),
            { a: "Penawaran perkenalan", b: "", c: null, d: p.intro_offer },
            { a: "", b: "", c: null, d: "" },
            ...out.budget.items.map((b) => ({ a: b.item, b: b.pct, c: b.amount, d: b.note })),
            { a: "TOTAL BUDGET", b: 100, c: out.budget.total, d: out.budget.basis === "rekomendasi" ? "Rekomendasi — sesuaikan dengan dana yang tersedia" : "" },
          ],
          rowColor: (r) => (r.a === "TOTAL BUDGET" ? "E8F8EF" : null),
        },
      ],
    };
  },
};

/** Gabungkan aktivitas per minggu menjadi satu baris tabel PPT. */
function compactTimeline(list: { week: number; activity: string; owner: string }[], when: (w: number) => string) {
  const map = new Map<number, { acts: string[]; owners: Set<string> }>();
  for (const x of list) {
    const g = map.get(x.week) ?? { acts: [], owners: new Set<string>() };
    g.acts.push(x.activity);
    g.owners.add(x.owner);
    map.set(x.week, g);
  }
  return [...map.entries()].map(([w, g]) => [clip(when(w), 60), clip(g.acts.join("; "), 60), clip([...g.owners].join(", "), 60)]);
}

export const gtmRunner = makeRunner(gtmDef);
