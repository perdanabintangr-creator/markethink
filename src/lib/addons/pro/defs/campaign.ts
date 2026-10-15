import "server-only";
import { clip, fileSlug } from "../../runtime";
import { makeRunner, type ProDef } from "../kit";
import { CAMPAIGN_OBJECTIVES, PHASE_LABEL, campaignForm, campaignOutput } from "../specs/campaign";
import { idr, normalize100, parseRupiah, splitAmount } from "../specs/plan";

const OBJECTIVE_RULE: Record<string, string> = {
  awareness: "Fokus reach & ingatan: KPI reach unik, frekuensi 2-3x, video view 3 dtk/ThruPlay, kenaikan pencarian nama brand & followers. Jangan menjanjikan ROAS tinggi.",
  consideration: "Fokus membuat orang mempertimbangkan & mencoba: KPI klik, add to cart, save/share, chat masuk, sampel/trial. Konten edukasi & perbandingan cara pakai.",
  sales: "Fokus penjualan: KPI order, omzet, ROAS (sebut angka impas dari margin bila diketahui), CPA, konversi. Wajib ada mekanik penawaran yang jelas & tenggat.",
  launch: "Fokus launching: pola teaser (penasaran) → launch (ledakan reach + penawaran perdana terbatas) → sustain (bukti & ulasan). KPI awareness + trial + ulasan pertama.",
  retention: "Fokus pelanggan lama: KPI repeat order rate, pembelian kedua dalam 30-60 hari, member/loyalty sign-up, CRM WhatsApp. Kanal utama owned (WA, email, komunitas).",
};
const ORDER = { teaser: 0, launch: 1, sustain: 2 } as const;

export const campaignDef: ProDef<typeof campaignOutput> = {
  tool: "campaign",
  addon: "strategi_pro",
  form: campaignForm,
  output: campaignOutput,
  maxOutputTokens: 15000,
  role: `Kamu Strategic Planner senior di agency kreatif Jakarta yang sudah menulis ratusan creative brief untuk brand lokal & multinasional.
Brief-mu terkenal satu halaman yang tajam: tim kreatif langsung paham masalahnya, insight-nya terasa "iya banget", dan tim media
tahu persis apa yang harus diproduksi, kapan, dan berapa biayanya.`,
  rules: (input) => {
    const obj = CAMPAIGN_OBJECTIVES.find(([v]) => v === input.objective)?.[1] ?? "Penjualan";
    return `- Tujuan kampanye: ${obj}. ${OBJECTIVE_RULE[String(input.objective)] ?? OBJECTIVE_RULE.sales}
- Alur brief: masalah bisnis → masalah komunikasi → insight → proposition → big idea → eksekusi. Semua harus nyambung satu garis.
- problem: tajam dan spesifik (mis. "Pembeli menganggap serum Rp89rb sama saja dengan yang Rp35rb, jadi memilih yang murah").
- insight: kebenaran manusiawi yang membuat target merasa "kok tahu?" — rumus: [yang mereka lakukan/rasakan] + [karena] + [ketegangan/kontradiksi].
  BUKAN data demografi dan BUKAN fitur produk. Tulis dari sudut pandang konsumen.
- proposition: satu hal (single-minded), bukan daftar manfaat. Maks ±12 kata.
- big_idea: konsep yang bisa hidup di semua kanal & bisa dieksekusi berulang (format, ritual, tantangan, seri konten), bukan sekadar tema
  atau diskon. Jelaskan bagaimana muncul di tiap kanal.
- taglines: tepat 3 opsi, ≤6 kata, bahasa target, tidak meniru tagline terkenal.
- rtb: hanya fakta produk/brand dari user. Jangan mengarang klaim (BPOM, halal, uji klinis, "no.1") bila tidak disebut user.
- channels: peran jelas per kanal + eksekusi spesifik (format, jumlah, mekanik) + fase. ${(input.channels as unknown as string[])?.length ? `Prioritaskan kanal pilihan user: ${(input.channels as unknown as string[]).join(", ")}.` : "Pilih kanal paling efisien untuk tujuan & target."}
- deliverables: daftar siap produksi — item, jumlah, spesifikasi teknis (9:16 1080×1920, durasi, ukuran feed 1080×1350, dll.), kanal, PIC, tenggat
  relatif terhadap tanggal launch (H-14, H-7, dst.) atau tanggal. Hitung jumlah konten KOL sesuai budget (nano/mikro lebih efisien untuk budget kecil).
- phases: tepat 3 (teaser, launch, sustain) dengan rentang waktu di dalam periode${input.period ? ` (${input.period})` : ""}. Bila periode tidak disebut, usulkan 4-6 minggu.
- budget: pos per kanal media, KOL/affiliate, produksi, promo/voucher, cadangan 5-10%. Pakai persen yang masuk akal untuk tujuan
  (awareness: media & KOL dominan; sales: iklan konversi + voucher; retensi: CRM & promo member). total diisi dari isian user (Rupiah penuh);
  bila kosong, rekomendasikan dan basis "rekomendasi". Nominal per pos dihitung sistem dari persen.
- mandatories: gabungkan isian user${input.mandatory ? ` (${input.mandatory})` : ""} + kewajiban umum (disclosure #ad/#sponsored untuk KOL, aturan klaim BPOM/iklan bila relevan).
- success: berjenjang — bisnis (omzet/order), kampanye (reach, CTR, CPA), konten (view rate, save, share) — lengkap dengan alat ukur & waktu evaluasi.`;
  },
  post(out, input) {
    out.phases = [...out.phases].sort((a, b) => ORDER[a.phase] - ORDER[b.phase]);
    out.deliverables = out.deliverables.map((d) => ({ ...d, qty: Math.max(1, Math.round(Number(d.qty) || 1)) }));
    const raw = String(input.budget ?? "").trim();
    const parsed = parseRupiah(raw);
    if (parsed) out.budget.total = parsed.amount;
    out.budget.basis = raw ? "user" : "rekomendasi";
    if (out.budget.total !== null && !(out.budget.total > 0)) out.budget.total = null;
    const pcts = normalize100(out.budget.items.map((b) => Number(b.pct) || 0));
    const amounts = splitAmount(out.budget.total, pcts);
    out.budget.items = out.budget.items.map((b, i) => ({ ...b, pct: pcts[i], amount: amounts[i] })).sort((a, b) => b.pct - a.pct);
  },
  title: (out, input) => `Campaign brief "${out.name}" — ${input.brand}`,
  files(out, input) {
    const brand = String(input.brand);
    const totalQty = out.deliverables.reduce((s, d) => s + d.qty, 0);
    const budgetLabel = out.budget.total !== null ? `${idr(out.budget.total)}${out.budget.basis === "rekomendasi" ? " (rekomendasi)" : ""}` : "-";
    return {
      name: `campaign-brief-${fileSlug(brand)}-${fileSlug(out.name)}`,
      deckLabel: "PPT campaign brief",
      sheetLabel: "Excel deliverables, timeline & budget",
      deck: {
        title: clip(out.name, 90),
        subtitle: clip(`Campaign brief · ${brand}${input.period ? ` · ${input.period}` : ""}`, 160),
        theme: "sunset",
        cover_style: "split",
        slides: [
          {
            layout: "cards",
            kicker: "LATAR BELAKANG",
            title: "Kenapa kampanye ini perlu",
            cards: [
              { icon: "file-text", title: "Situasi", text: clip(out.background, 160) },
              { icon: "zap", title: "Masalah bisnis", text: clip(out.problem, 160) },
              { icon: "target", title: "Objective", text: clip(out.objective, 160) },
            ],
          },
          {
            layout: "stats",
            kicker: "KPI",
            title: "Ukuran keberhasilan",
            stats: out.kpis.slice(0, 4).map((k) => ({ value: clip(k.target, 12), label: clip(k.metric, 60), note: clip(k.note, 80) })),
          },
          {
            layout: "comparison",
            kicker: "TARGET AUDIENS",
            title: "Dari mana ke mana",
            subtitle: clip(out.audience.profile, 160),
            columns: [
              { heading: "Sekarang mereka…", bullets: [clip(out.audience.current, 110)] },
              { heading: "Setelah kampanye…", bullets: [clip(out.audience.desired, 110)] },
            ],
          },
          { layout: "quote", kicker: "CONSUMER INSIGHT", title: "Yang mereka rasakan", quote: clip(out.audience.insight, 240) },
          { layout: "quote", kicker: "SINGLE-MINDED PROPOSITION", title: "Satu hal yang harus diingat", quote: clip(out.proposition, 240) },
          {
            layout: "bullets",
            kicker: "BIG IDEA",
            title: clip(out.big_idea.title, 90),
            subtitle: clip(out.big_idea.why, 160),
            bullets: splitSentences(out.big_idea.description),
          },
          {
            layout: "cards",
            kicker: "PESAN",
            title: clip(out.key_message, 90),
            cards: [
              ...out.taglines.slice(0, 3).map((x, i) => ({ icon: "sparkles", title: clip(`Tagline ${i + 1}`, 40), text: clip(`"${x.line}" — ${x.note}`, 160) })),
              { icon: "circle-check", title: "Reasons to believe", text: clip(out.rtb.join(" · "), 160) },
            ],
          },
          {
            layout: "table",
            kicker: "CHANNEL PLAN",
            title: "Peran & eksekusi tiap kanal",
            table: {
              headers: ["Kanal", "Peran", "Eksekusi", "Fase", "Waktu"],
              rows: out.channels.slice(0, 7).map((c) => [clip(c.channel, 60), clip(c.role, 60), clip(c.execution, 60), c.phase === "semua" ? "Semua" : PHASE_LABEL[c.phase], clip(c.timing, 60)]),
            },
          },
          {
            layout: "table",
            kicker: "DELIVERABLES",
            title: `${totalQty} materi yang diproduksi`,
            table: {
              headers: ["Item", "Jml", "Spesifikasi", "PIC", "Deadline"],
              rows: out.deliverables.slice(0, 7).map((d) => [clip(d.item, 60), String(d.qty), clip(d.spec, 60), clip(d.owner, 60), clip(d.deadline, 60)]),
            },
          },
          {
            layout: "timeline",
            kicker: "TIMELINE",
            title: "Teaser → Launch → Sustain",
            steps: out.phases.slice(0, 6).map((p) => ({ title: clip(`${PHASE_LABEL[p.phase]} · ${p.period}`, 40), text: clip(`${p.goal}. ${p.activities.slice(0, 2).join("; ")}`, 120) })),
          },
          {
            layout: "chart",
            kicker: "BUDGET",
            title: clip(`Budget ${budgetLabel}`, 90),
            subtitle: clip(out.budget.items.map((b) => `${b.item} ${idr(b.amount)}`).join(" · "), 160),
            chart: { type: "doughnut", labels: out.budget.items.slice(0, 12).map((b) => clip(b.item, 30)), series: [{ name: "Porsi", values: out.budget.items.slice(0, 12).map((b) => b.pct) }], unit: "%" },
          },
          {
            layout: "comparison",
            kicker: "MANDATORIES",
            title: "Wajib & dilarang",
            subtitle: clip(`Tone: ${out.tone.words.join(", ")} — ${out.tone.note}`, 160),
            columns: [
              { heading: "Dilarang", bullets: out.mandatories.avoid.slice(0, 5).map((x) => clip(x, 110)) },
              { heading: "Wajib ada", bullets: out.mandatories.must.slice(0, 5).map((x) => clip(x, 110)) },
            ],
          },
          {
            layout: "table",
            kicker: "SUCCESS METRICS",
            title: "Cara kita menilai hasil",
            table: {
              headers: ["Level", "Metrik", "Target", "Cara ukur"],
              rows: out.success.slice(0, 7).map((s) => [s.level, clip(s.metric, 60), clip(s.target, 60), clip(s.how, 60)]),
            },
          },
          { layout: "closing", title: clip(out.name, 90), bullets: [clip(out.proposition, 140), clip(out.key_message, 140)] },
        ],
      },
      sheets: [
        {
          name: "Deliverables",
          title: `Deliverables — ${out.name} (${brand})`,
          columns: [
            { header: "No", key: "no", width: 5 },
            { header: "Item", key: "item", width: 30 },
            { header: "Jumlah", key: "qty", width: 9 },
            { header: "Spesifikasi", key: "spec", width: 54 },
            { header: "Kanal", key: "channel", width: 16 },
            { header: "PIC", key: "owner", width: 20 },
            { header: "Deadline", key: "deadline", width: 16 },
            { header: "Status", key: "status", width: 12 },
          ],
          rows: [...out.deliverables.map((d, i) => ({ ...d, no: i + 1, status: "Belum" })), { no: "", item: "TOTAL", qty: totalQty, spec: "", channel: "", owner: "", deadline: "", status: "" }],
          rowColor: (r) => (r.item === "TOTAL" ? "E8F8EF" : null),
        },
        {
          name: "Timeline",
          columns: [
            { header: "Fase", key: "phase", width: 12 },
            { header: "Periode", key: "period", width: 22 },
            { header: "Tujuan", key: "goal", width: 44 },
            { header: "Aktivitas", key: "activities", width: 70 },
            { header: "Kanal aktif", key: "channels", width: 34 },
          ],
          rows: out.phases.map((p) => ({
            phase: PHASE_LABEL[p.phase],
            period: p.period,
            goal: p.goal,
            activities: p.activities.map((a) => `• ${a}`).join("\n"),
            channels: out.channels.filter((c) => c.phase === p.phase || c.phase === "semua").map((c) => c.channel).join(", "),
          })),
          rowColor: (r) => (r.phase === "Launch" ? "FFF7E0" : null),
        },
        {
          name: "Budget",
          title: `Budget kampanye — ${budgetLabel}`,
          columns: [
            { header: "Pos", key: "item", width: 28 },
            { header: "Porsi (%)", key: "pct", width: 11 },
            { header: "Nominal", key: "amount", width: 18, money: true },
            { header: "Catatan", key: "note", width: 60 },
          ],
          rows: [...out.budget.items, { item: "TOTAL", pct: 100, amount: out.budget.total, note: out.budget.basis === "rekomendasi" ? "Rekomendasi — sesuaikan dengan dana yang tersedia" : "" }],
          rowColor: (r) => (r.item === "TOTAL" ? "E8F8EF" : null),
        },
        {
          name: "Channel plan & KPI",
          columns: [
            { header: "Kanal / metrik", key: "a", width: 24 },
            { header: "Peran / target", key: "b", width: 40 },
            { header: "Eksekusi / cara ukur", key: "c", width: 70 },
            { header: "Fase / level", key: "d", width: 14 },
            { header: "Waktu", key: "e", width: 18 },
          ],
          rows: [
            ...out.channels.map((c) => ({ a: c.channel, b: c.role, c: c.execution, d: c.phase === "semua" ? "Semua" : PHASE_LABEL[c.phase], e: c.timing })),
            { a: "", b: "", c: "", d: "", e: "" },
            ...out.success.map((s) => ({ a: s.metric, b: s.target, c: s.how, d: s.level, e: "" })),
          ],
        },
      ],
    };
  },
};

/** Pecah paragraf jadi poin (maks 6 × 140 karakter). */
function splitSentences(text: string) {
  const parts = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return (parts.length ? parts : [text]).slice(0, 6).map((s) => clip(s, 140));
}

export const campaignRunner = makeRunner(campaignDef);
