import "server-only";
import { clip, fileSlug } from "../../runtime";
import { fmt } from "../../helpers";
import { atLeast, makeRunner, type ProDef } from "../kit";
import { STATUS_LABEL, kpiValue, reportForm, reportOutput } from "../specs/report";

const AUDIENCE: Record<string, string> = {
  owner: "owner/atasan yang sibuk: langsung ke angka, untung-rugi, dan keputusan yang dibutuhkan",
  client: "klien agency: profesional, jujur soal hasil yang kurang, tunjukkan nilai kerja agency dan rencana perbaikan yang meyakinkan",
  team: "tim internal: detail taktis per kanal, siapa mengerjakan apa",
};

export const reportDef: ProDef<typeof reportOutput> = {
  tool: "report",
  addon: "laporan_pro",
  form: reportForm,
  output: reportOutput,
  maxOutputTokens: 14000,
  validate: (input) =>
    !(input.attachment_ids as string[] | undefined)?.length && !String(input.data ?? "").trim()
      ? "Upload file data atau tulis angka utama bulan ini dulu, ya."
      : null,
  role: `Kamu Marketing Director yang setiap bulan menyusun laporan kinerja marketing untuk board/klien. Laporanmu terkenal ringkas, jujur,
berbasis data, dan selalu diakhiri keputusan yang jelas — bukan sekadar daftar angka.`,
  rules: (input) => `- Pembaca: ${AUDIENCE[String(input.audience)] ?? AUDIENCE.owner}. Periode: ${input.period}.
- Pakai HANYA angka dari file/data user. Jangan mengarang angka; bila sebuah KPI tidak ada datanya, jangan dimasukkan. Bila data bulan lalu
  tidak ada, previous = null. Bila target tidak disebut, status "tanpa_target".
- Status KPI: tercapai (≥100% target), hampir (90-99%), tertinggal (<90%). Untuk biaya per hasil (CPA/CAC), lebih rendah = lebih baik.
- Hitung metrik turunan bila komponennya ada (ROAS = pendapatan/biaya, CPA = biaya/hasil, AOV = omzet/order, ER), tulis caranya di note.
- channels: satu baris per kanal yang ada datanya; verdict jujur.
- Insight harus "so what": temuan → bukti angka → artinya untuk keputusan bisnis. Hindari insight generik seperti "konten video lebih disukai".
- Aksi bulan depan konkret dan bisa dicek: apa, siapa (peran), kapan, KPI-nya. Usulan budget berbasis efisiensi kanal (geser dari yang boros ke yang efisien).
- headline: satu kalimat berangka (mis. "Omzet naik 18% ke Rp84 jt, tapi ROAS TikTok di bawah impas — biaya dialihkan ke Meta.").`,
  title: (_out, input) => `Laporan marketing ${input.period} — ${input.brand}`,
  files(out, input) {
    const color = /^#?[0-9a-fA-F]{6}$/.test(String(input.color ?? "")) ? String(input.color) : undefined;
    const top = out.kpis.slice(0, 4);
    const withMoney = out.channels.filter((c) => c.spend !== null || c.revenue !== null);
    return {
      name: `laporan-marketing-${fileSlug(String(input.brand))}-${fileSlug(String(input.period))}`,
      deckLabel: "PPT laporan siap presentasi",
      sheetLabel: "Excel data laporan",
      deck: {
        title: clip(`Laporan Marketing ${input.period}`, 90),
        subtitle: clip(String(input.brand), 160),
        theme: "corporate",
        cover_style: "split",
        ...(color ? { brand_color: color } : {}),
        slides: [
          { layout: "quote", kicker: "RINGKASAN EKSEKUTIF", title: clip(out.headline, 90), quote: clip(out.summary, 240) },
          {
            layout: "stats",
            kicker: "ANGKA UTAMA",
            title: "Kinerja bulan ini",
            stats: atLeast(
              top.map((k) => ({
                value: clip(kpiValue(k, k.value), 12),
                label: clip(k.name, 60),
                note: clip(k.target !== null ? `Target ${kpiValue(k, k.target)} · ${STATUS_LABEL[k.status]}` : k.previous !== null ? `Bulan lalu ${kpiValue(k, k.previous)}` : k.note, 80),
              })),
              2,
              { value: `${out.channels.length}`, label: "Kanal dilaporkan", note: "" },
            ),
          },
          {
            layout: "table",
            kicker: "KPI",
            title: "Pencapaian vs target",
            table: {
              headers: ["KPI", "Bulan ini", "Bulan lalu", "Target", "Status"],
              rows: out.kpis.slice(0, 7).map((k) => [clip(k.name, 60), kpiValue(k, k.value), kpiValue(k, k.previous), kpiValue(k, k.target), STATUS_LABEL[k.status]]),
            },
          },
          withMoney.length >= 2
            ? {
                layout: "chart",
                kicker: "KANAL",
                title: "Biaya vs pendapatan per kanal",
                subtitle: "Dalam juta Rupiah",
                chart: {
                  type: "bar",
                  labels: withMoney.map((c) => clip(c.channel, 30)),
                  series: [
                    { name: "Biaya", values: withMoney.map((c) => +((c.spend ?? 0) / 1e6).toFixed(1)) },
                    { name: "Pendapatan", values: withMoney.map((c) => +((c.revenue ?? 0) / 1e6).toFixed(1)) },
                  ],
                  unit: "jt",
                },
              }
            : {
                layout: "table",
                kicker: "KANAL",
                title: "Kinerja per kanal",
                table: { headers: ["Kanal", "Hasil", "Catatan"], rows: out.channels.slice(0, 7).map((c) => [clip(c.channel, 60), clip(c.result !== null ? `${fmt(c.result, 0)} ${c.result_label}` : "-", 60), clip(c.highlight, 60)]) },
              },
          {
            layout: "comparison",
            kicker: "EVALUASI",
            title: "Yang berhasil & yang perlu dibenahi",
            columns: [
              { heading: "Perlu dibenahi", bullets: out.issues.slice(0, 5).map((i) => clip(`${i.title}: ${i.detail}`, 110)) },
              { heading: "Berhasil", bullets: out.wins.slice(0, 5).map((w) => clip(`${w.title}: ${w.detail}`, 110)) },
            ],
          },
          {
            layout: "cards",
            kicker: "INSIGHT",
            title: "Apa artinya untuk bisnis",
            cards: out.insights.slice(0, 4).map((i) => ({ icon: "lightbulb", title: clip(i.insight, 40), text: clip(`${i.evidence} → ${i.so_what}`, 160) })),
          },
          {
            layout: "timeline",
            kicker: "BULAN DEPAN",
            title: clip(out.next_month.focus, 90),
            steps: atLeast(
              out.next_month.actions.slice(0, 6).map((a) => ({ title: clip(a.action, 40), text: clip(`${a.owner} · ${a.deadline} · KPI: ${a.kpi}`, 120) })),
              3,
              { title: "Evaluasi mingguan", text: "Review angka tiap Senin, sesuaikan budget & konten." },
            ),
          },
          { layout: "closing", title: "Keputusan yang dibutuhkan", bullets: [out.next_month.budget, out.data_notes].filter(Boolean).map((b) => clip(b, 140)) },
        ],
      },
      sheets: [
        {
          name: "KPI",
          title: `KPI ${input.period} — ${input.brand}`,
          columns: [
            { header: "KPI", key: "name", width: 26 },
            { header: "Bulan ini", key: "value", width: 16 },
            { header: "Bulan lalu", key: "previous", width: 16 },
            { header: "Target", key: "target", width: 16 },
            { header: "Satuan", key: "unit", width: 8 },
            { header: "Status", key: "status", width: 14 },
            { header: "Catatan", key: "note", width: 60 },
          ],
          rows: out.kpis.map((k) => ({ ...k, status: STATUS_LABEL[k.status] })),
          rowColor: (r) => (r.status === "Tercapai" ? "E8F8EF" : r.status === "Tertinggal" ? "FDECEC" : r.status === "Hampir" ? "FFF7E0" : null),
        },
        {
          name: "Kanal",
          columns: [
            { header: "Kanal", key: "channel", width: 20 },
            { header: "Biaya", key: "spend", width: 16, money: true },
            { header: "Pendapatan", key: "revenue", width: 16, money: true },
            { header: "Hasil", key: "result", width: 12 },
            { header: "Satuan hasil", key: "result_label", width: 14 },
            { header: "Penilaian", key: "verdict", width: 14 },
            { header: "Sorotan", key: "highlight", width: 50 },
            { header: "Masalah", key: "issue", width: 50 },
          ],
          rows: out.channels,
          rowColor: (r) => (r.verdict === "bagus" ? "E8F8EF" : r.verdict === "perlu_perbaikan" ? "FDECEC" : null),
        },
        {
          name: "Rencana bulan depan",
          title: out.next_month.focus,
          columns: [
            { header: "Aksi", key: "action", width: 60 },
            { header: "PIC", key: "owner", width: 18 },
            { header: "Tenggat", key: "deadline", width: 14 },
            { header: "KPI", key: "kpi", width: 36 },
          ],
          rows: out.next_month.actions,
        },
      ],
    };
  },
};

export const reportRunner = makeRunner(reportDef);
