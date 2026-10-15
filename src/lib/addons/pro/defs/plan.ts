import "server-only";
import { clip, fileSlug } from "../../runtime";
import { makeRunner, type ProDef } from "../kit";
import { monthOptions } from "../specs/common";
import { FUNNEL_LABEL, idr, normalize100, parseRupiah, planForm, planOutput, splitAmount } from "../specs/plan";

const PERIOD_LABEL: Record<string, string> = { "3": "3 bulan", "6": "6 bulan", "12": "12 bulan" };
const LEVEL_SCORE = { tinggi: 3, sedang: 2, rendah: 1 } as const;
const PILLAR_ICONS = ["flag", "rocket", "users", "repeat"];

/** Label bulan rencana: mulai bulan depan. */
function planMonths(n: number) {
  return monthOptions(n + 1).slice(1).map(([, label]) => label);
}

export const planDef: ProDef<typeof planOutput> = {
  tool: "plan",
  addon: "strategi_pro",
  form: planForm,
  output: planOutput,
  maxOutputTokens: 16000,
  role: `Kamu Head of Marketing / CMO dengan pengalaman membesarkan brand lokal Indonesia dari omzet puluhan juta ke miliaran per bulan.
Kamu menyusun marketing plan kuartalan & tahunan yang dipresentasikan ke owner dan board: tajam di angka, jelas prioritasnya,
realistis untuk kapasitas tim, dan langsung bisa diturunkan menjadi kerja mingguan.`,
  rules: (input) => {
    const n = Number(input.period) || 6;
    const months = planMonths(n);
    const roadmapRule =
      n <= 6
        ? `roadmap: TEPAT ${n} baris, satu per bulan, period memakai label: ${months.join(", ")}.`
        : `roadmap: 4 fase per kuartal (3 bulan), period mis. "${months[0]}–${months[2]}", "${months[3]}–${months[5]}", dst. sampai ${months[11]}.`;
    const channels = (input.channels as unknown as string[]) ?? [];
    return `- Periode rencana: ${PERIOD_LABEL[String(n)] ?? `${n} bulan`}, mulai ${months[0]} sampai ${months[n - 1]}. Deadline tujuan harus di dalam rentang ini.
- Urutan berpikir: angka sekarang → gap ke target → dari mana gap ditutup (pelanggan baru vs repeat vs AOV) → kanal & pilar → budget → roadmap.
  Pecah target omzet menjadi komponen (order × AOV, pelanggan baru × konversi, repeat rate) dan tunjukkan di objectives/insights.
- Cek realisme target: pertumbuhan >15%/bulan berkelanjutan jarang terjadi tanpa tambahan budget/kanal baru. Bila target user tidak realistis
  dengan budget & tim, katakan terus terang di summary dan usulkan target bertahap (tetap hormati target user sebagai stretch).
- situation: SWOT ringkas dari data user (bukan generik). Insight = temuan tajam + implikasinya, mis. "35% pembeli repeat → retensi lebih murah
  daripada akuisisi; WhatsApp broadcast jadi pilar".
- objectives: SMART. Baseline dari data user; bila tidak ada tulis "belum diukur" dan jadikan pengukurannya quick win. Target angka jelas.
- segment & positioning: pilih SATU segmen utama yang paling cepat menghasilkan (bukan "semua orang"). Positioning format
  "Untuk … yang …, [brand] adalah … yang … karena …".
- pillars: 3-4 taruhan strategis yang saling mengunci (mis. akuisisi efisien, konversi marketplace, retensi & repeat, brand/komunitas).
- channels: 4-7 kanal. Kanal yang sudah dipakai user${channels.length ? ` (${channels.join(", ")})` : ""} dievaluasi dulu sebelum menambah kanal baru;
  kanal baru maksimal 1-2 sesuai kapasitas tim. Tiap kanal punya peran funnel yang jelas, taktik spesifik (format, frekuensi, mekanik promo),
  KPI & target bulanan. budget_pct = porsi budget kanal (organik = 0).
- budget: items = pos anggaran (iklan per platform, KOL/affiliate, produksi konten, promo/voucher marketplace, tools, cadangan uji coba 10%).
  Pola sehat: ±70% kanal terbukti, ±20% pengembangan, ±10% eksperimen. Kalau budget kecil (<Rp5 jt/bulan) fokus 1-2 kanal berbayar saja.
  monthly diisi dari isian user (Rupiah penuh); bila user tidak mengisi, rekomendasikan budget realistis ±5-15% dari omzet dan basis "rekomendasi".
  Angka nominal per pos dihitung sistem dari persen — fokus pada persen yang tepat.
- ${roadmapRule} Aktivitas memanfaatkan momen belanja Indonesia yang jatuh di periode itu (payday 25, tanggal kembar, Ramadan/Lebaran,
  Harbolnas 12.12, akhir tahun, back to school) bila relevan. Milestone terukur.
- measurement: KPI, alat ukur nyata (Seller Center, Ads Manager, GA4, sheet CRM), frekuensi review (mingguan untuk iklan, bulanan untuk bisnis), PIC.
- risks: 3-5 risiko spesifik (bukan "persaingan ketat") + mitigasi yang bisa dijalankan.
- quick_wins: 4-6 aksi 30 hari pertama berbiaya rendah yang terasa hasilnya, dengan PIC sesuai tim user${input.team ? ` (${input.team})` : ""}.`;
  },
  post(out, input) {
    // Urutkan tujuan: bisnis dulu.
    out.objectives = [...out.objectives].sort((a, b) => (a.level === b.level ? 0 : a.level === "bisnis" ? -1 : 1));

    // Porsi budget kanal → 100% (kanal organik tetap 0).
    const chSum = out.channels.reduce((s, c) => s + (Number(c.budget_pct) > 0 ? Number(c.budget_pct) : 0), 0);
    if (chSum > 0) {
      const pcts = normalize100(out.channels.map((c) => Number(c.budget_pct) || 0));
      out.channels = out.channels.map((c, i) => ({ ...c, budget_pct: pcts[i] }));
    }

    // Budget per bulan: utamakan angka dari isian user.
    const raw = String(input.budget ?? "").trim();
    const parsed = parseRupiah(raw);
    if (parsed) out.budget.monthly = parsed.perYear ? Math.round(parsed.amount / 12) : parsed.amount;
    out.budget.basis = raw ? "user" : "rekomendasi";
    if (out.budget.monthly !== null && !(out.budget.monthly > 0)) out.budget.monthly = null;
    const pcts = normalize100(out.budget.items.map((b) => Number(b.pct) || 0));
    const amounts = splitAmount(out.budget.monthly, pcts);
    out.budget.items = out.budget.items.map((b, i) => ({ ...b, pct: pcts[i], amount: amounts[i] })).sort((a, b) => b.pct - a.pct);

    out.risks = [...out.risks].sort((a, b) => LEVEL_SCORE[b.likelihood] * LEVEL_SCORE[b.impact] - LEVEL_SCORE[a.likelihood] * LEVEL_SCORE[a.impact]);
  },
  title: (_out, input) => `Marketing plan ${PERIOD_LABEL[String(input.period)] ?? ""} — ${input.brand}`.replace(/\s+/g, " "),
  files(out, input) {
    const n = Number(input.period) || 6;
    const months = planMonths(n);
    const range = `${months[0]} – ${months[n - 1]}`;
    const s = out.situation;
    const monthly = out.budget.monthly;
    const budgetNote = monthly !== null ? `${idr(monthly)}/bulan${out.budget.basis === "rekomendasi" ? " (rekomendasi)" : ""}` : "Budget belum ditentukan";
    return {
      name: `marketing-plan-${fileSlug(String(input.brand))}-${n}-bulan`,
      deckLabel: "PPT marketing plan",
      sheetLabel: "Excel rencana & budget",
      deck: {
        title: clip(`Marketing Plan ${PERIOD_LABEL[String(n)] ?? ""}`, 90),
        subtitle: clip(`${input.brand} · ${range}`, 160),
        theme: "ocean",
        cover_style: "split",
        slides: [
          { layout: "quote", kicker: "RINGKASAN EKSEKUTIF", title: clip(out.headline, 90), quote: clip(out.summary, 240) },
          {
            layout: "cards",
            kicker: "ANALISIS SITUASI",
            title: "Posisi kita sekarang",
            cards: [
              { icon: "shield", title: "Kekuatan", text: clip(s.strengths.join(" · "), 160) },
              { icon: "search", title: "Kelemahan", text: clip(s.weaknesses.join(" · "), 160) },
              { icon: "trending-up", title: "Peluang", text: clip(s.opportunities.join(" · "), 160) },
              { icon: "bell", title: "Ancaman", text: clip(s.threats.join(" · "), 160) },
            ].filter((c) => c.text),
          },
          {
            layout: "bullets",
            kicker: "INSIGHT KUNCI",
            title: "Yang mengubah cara kita bermain",
            bullets: s.insights.slice(0, 6).map((i) => clip(`${i.insight} → ${i.implication}`, 140)),
          },
          {
            layout: "table",
            kicker: "TUJUAN SMART",
            title: `Target sampai ${months[n - 1]}`,
            table: {
              headers: ["Tujuan", "Metrik", "Sekarang", "Target", "Deadline"],
              rows: out.objectives.slice(0, 7).map((o) => [clip(o.objective, 60), clip(o.metric, 60), clip(o.baseline, 60), clip(o.target, 60), clip(o.deadline, 60)]),
            },
          },
          {
            layout: "cards",
            kicker: "TARGET PASAR",
            title: "Siapa yang kita kejar dulu",
            cards: [
              { icon: "target", title: "Segmen utama", text: clip(out.segment.primary, 160) },
              { icon: "heart", title: "Kebutuhan mereka", text: clip(out.segment.need, 160) },
              ...(out.segment.secondary ? [{ icon: "user-check", title: "Segmen berikutnya", text: clip(out.segment.secondary, 160) }] : []),
            ],
          },
          { layout: "quote", kicker: "POSITIONING", title: "Posisi brand di kepala pembeli", quote: clip(out.segment.positioning, 240) },
          {
            layout: "cards",
            kicker: "PILAR STRATEGIS",
            title: `${out.pillars.length} taruhan utama`,
            cards: out.pillars.slice(0, 6).map((p, i) => ({ icon: PILLAR_ICONS[i % PILLAR_ICONS.length], title: clip(p.name, 40), text: clip(`${p.goal}. ${p.initiatives.slice(0, 2).join("; ")}`, 160) })),
          },
          {
            layout: "table",
            kicker: "CHANNEL PLAN",
            title: "Peran tiap kanal",
            table: {
              headers: ["Kanal", "Funnel", "Taktik utama", "Budget", "KPI / target"],
              rows: out.channels.slice(0, 7).map((c) => [clip(c.channel, 60), FUNNEL_LABEL[c.funnel], clip(c.tactics[0] ?? c.role, 60), `${c.budget_pct}%`, clip(`${c.kpi}: ${c.target}`, 60)]),
            },
          },
          {
            layout: "timeline",
            kicker: "ROADMAP",
            title: range,
            steps: out.roadmap.slice(0, 6).map((r) => ({ title: clip(`${r.period} · ${r.theme}`, 40), text: clip(r.milestone, 120) })),
          },
          {
            layout: "table",
            kicker: "ROADMAP",
            title: "Aktivitas per periode",
            table: {
              headers: ["Periode", "Fokus", "Aktivitas utama", "Milestone"],
              rows: out.roadmap.slice(0, 7).map((r) => [clip(r.period, 60), clip(r.theme, 60), clip(r.activities.slice(0, 2).join("; "), 60), clip(r.milestone, 60)]),
            },
          },
          {
            layout: "chart",
            kicker: "ALOKASI BUDGET",
            title: clip(`Budget ${budgetNote}`, 90),
            subtitle: clip(out.budget.note, 160),
            chart: { type: "doughnut", labels: out.budget.items.slice(0, 12).map((b) => clip(b.item, 30)), series: [{ name: "Porsi", values: out.budget.items.slice(0, 12).map((b) => b.pct) }], unit: "%" },
          },
          {
            layout: "table",
            kicker: "ALOKASI BUDGET",
            title: "Rincian per pos",
            table: {
              headers: ["Pos", "Porsi", "Per bulan", "Catatan"],
              rows: out.budget.items.slice(0, 7).map((b) => [clip(b.item, 60), `${b.pct}%`, idr(b.amount), clip(b.note, 60)]),
            },
          },
          {
            layout: "table",
            kicker: "PENGUKURAN",
            title: "KPI & ritme review",
            table: {
              headers: ["KPI", "Alat ukur", "Frekuensi", "PIC"],
              rows: out.measurement.slice(0, 7).map((m) => [clip(m.kpi, 60), clip(m.tool, 60), clip(m.frequency, 60), clip(m.owner, 60)]),
            },
          },
          {
            layout: "table",
            kicker: "RISIKO",
            title: "Risiko & mitigasi",
            table: {
              headers: ["Risiko", "Peluang", "Dampak", "Mitigasi"],
              rows: out.risks.slice(0, 6).map((r) => [clip(r.risk, 60), r.likelihood, r.impact, clip(r.mitigation, 60)]),
            },
          },
          {
            layout: "closing",
            kicker: "30 HARI PERTAMA",
            title: "Quick wins",
            bullets: out.quick_wins.slice(0, 6).map((q) => clip(`${q.action} (${q.owner}, ${q.due})`, 140)),
          },
        ],
      },
      sheets: [
        {
          name: "Objectives",
          title: `Tujuan ${range} — ${input.brand}`,
          columns: [
            { header: "Tujuan", key: "objective", width: 44 },
            { header: "Level", key: "level", width: 11 },
            { header: "Metrik", key: "metric", width: 24 },
            { header: "Baseline", key: "baseline", width: 18 },
            { header: "Target", key: "target", width: 18 },
            { header: "Deadline", key: "deadline", width: 18 },
            { header: "Realisasi", key: "actual", width: 14 },
            { header: "Catatan", key: "note", width: 30 },
          ],
          rows: out.objectives.map((o) => ({ ...o, actual: "", note: "" })),
          rowColor: (r) => (r.level === "bisnis" ? "EEF2FF" : null),
        },
        {
          name: "Channel plan",
          columns: [
            { header: "Kanal", key: "channel", width: 20 },
            { header: "Funnel", key: "funnel", width: 15 },
            { header: "Peran", key: "role", width: 40 },
            { header: "Taktik utama", key: "tactics", width: 70 },
            { header: "Budget (%)", key: "budget_pct", width: 11 },
            { header: "Budget / bulan", key: "amount", width: 16, money: true },
            { header: "KPI", key: "kpi", width: 22 },
            { header: "Target / bulan", key: "target", width: 22 },
          ],
          rows: out.channels.map((c) => ({
            ...c,
            funnel: FUNNEL_LABEL[c.funnel],
            tactics: c.tactics.map((x) => `• ${x}`).join("\n"),
            amount: monthly !== null && c.budget_pct > 0 ? Math.round((monthly * c.budget_pct) / 100 / 1000) * 1000 : null,
          })),
        },
        {
          name: "Roadmap",
          title: `Roadmap ${range}`,
          columns: [
            { header: "Periode", key: "period", width: 20 },
            { header: "Fokus", key: "theme", width: 28 },
            { header: "Aktivitas utama", key: "activities", width: 80 },
            { header: "Milestone", key: "milestone", width: 44 },
            { header: "Status", key: "status", width: 12 },
          ],
          rows: out.roadmap.map((r) => ({ ...r, activities: r.activities.map((a) => `• ${a}`).join("\n"), status: "Rencana" })),
        },
        {
          name: "Budget",
          title: `Alokasi budget — ${budgetNote}`,
          columns: [
            { header: "Pos", key: "item", width: 26 },
            { header: "Porsi (%)", key: "pct", width: 11 },
            { header: "Per bulan", key: "amount", width: 16, money: true },
            { header: `Total ${n} bulan`, key: "total", width: 18, money: true },
            { header: "Catatan", key: "note", width: 60 },
          ],
          rows: [
            ...out.budget.items.map((b) => ({ ...b, total: b.amount !== null ? b.amount * n : null })),
            { item: "TOTAL", pct: 100, amount: monthly, total: monthly !== null ? monthly * n : null, note: out.budget.note },
          ],
          rowColor: (r) => (r.item === "TOTAL" ? "E8F8EF" : null),
        },
        {
          name: "KPI, risiko & quick wins",
          columns: [
            { header: "Jenis", key: "kind", width: 14 },
            { header: "Item", key: "a", width: 50 },
            { header: "Detail", key: "b", width: 60 },
            { header: "PIC / frekuensi", key: "c", width: 22 },
            { header: "Waktu / level", key: "d", width: 18 },
          ],
          rows: [
            ...out.measurement.map((m) => ({ kind: "Pengukuran", a: m.kpi, b: m.tool, c: m.owner, d: m.frequency })),
            ...out.risks.map((r) => ({ kind: "Risiko", a: r.risk, b: r.mitigation, c: "", d: `peluang ${r.likelihood} · dampak ${r.impact}` })),
            ...out.quick_wins.map((q) => ({ kind: "Quick win", a: q.action, b: q.impact, c: q.owner, d: q.due })),
          ],
          rowColor: (r) => (r.kind === "Risiko" ? "FDECEC" : r.kind === "Quick win" ? "E8F8EF" : null),
        },
      ],
    };
  },
};

export const planRunner = makeRunner(planDef);
