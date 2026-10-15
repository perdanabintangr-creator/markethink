import "server-only";
import { clip, fileSlug } from "../../runtime";
import { atLeast, makeRunner, type ProDef } from "../kit";
import { calendarForm, calendarOutput } from "../specs/calendar";
import { monthLabel } from "../specs/common";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const calendarDef: ProDef<typeof calendarOutput> = {
  tool: "calendar",
  addon: "konten_pro",
  form: calendarForm,
  output: calendarOutput,
  maxOutputTokens: 16000,
  validate: (input) => (/^\d{4}-\d{2}$/.test(String(input.month)) ? null : "Pilih bulan kalender dulu, ya."),
  role: `Kamu Head of Content & Social Media yang sudah memegang puluhan akun brand Indonesia. Kamu menyusun kalender konten bulanan
yang diserahkan ke tim kreatif dan langsung dieksekusi tanpa banyak revisi.`,
  rules: (input) => {
    const month = String(input.month);
    const perWeek = Number(input.per_week) || 5;
    const total = Math.round((perWeek * 30) / 7);
    return `- Bulan kalender: ${monthLabel(month)} (${month}). Semua tanggal posting & momen HARUS di dalam bulan ini, format YYYY-MM-DD.
- Jumlah posting: ±${total} (≈${perWeek}/minggu) dibagi ke platform: ${(input.platforms as unknown as string[]).join(", ")}. Sebar merata; jangan menumpuk di awal bulan.
- Pilar 3-5 dengan porsi seimbang (contoh pola: edukasi/value, bukti & testimoni nyata dari pelanggan bila ada, behind the scene, hiburan/relatable, jualan langsung).
  Konten jualan langsung maksimal ±25% kecuali tujuan bulan ini penjualan/peluncuran (maks 40%).
- Format sesuai platform (TikTok: video 15-45 dtk; Instagram: Reels, Carousel, Story; LinkedIn: teks/dokumen; YouTube: Shorts).
- Hook harus spesifik dan memancing berhenti scroll (pertanyaan tajam, angka, kontras, situasi relatable) — bukan "Hai guys!".
- Caption: paragraf pertama = hook, lalu isi bernilai, lalu CTA. Gunakan gaya bahasa brand. Hashtag campuran niche & umum, tanpa hashtag sampah.
- Jam tayang realistis untuk audiens Indonesia (mis. 07.00, 12.00, 19.00-21.00) dan bervariasi per platform.
- key_dates: momen nasional/hari besar/tanggal belanja (tanggal kembar, payday 25, hari besar keagamaan, hari nasional) yang relevan dengan brand di bulan itu.
- Sesuaikan dengan kemampuan produksi user; bila tim kecil, utamakan format yang bisa dibuat cepat dan bisa di-repurpose lintas platform.
- KPI terukur sesuai tujuan (reach, ER, saves, klik link, chat masuk, order dari sosmed).`;
  },
  post(out, input) {
    const month = String(input.month);
    out.posts = out.posts
      .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date))
      .map((p) => (p.date.startsWith(month) ? p : { ...p, date: `${month}-${p.date.slice(8, 10)}` }))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const total = out.pillars.reduce((s, p) => s + (Number(p.share_pct) || 0), 0);
    if (total > 0 && Math.abs(total - 100) > 2) out.pillars = out.pillars.map((p) => ({ ...p, share_pct: Math.round(((Number(p.share_pct) || 0) / total) * 100) }));
  },
  title: (_out, input) => `Kalender konten ${monthLabel(String(input.month))} — ${input.brand}`,
  files(out, input) {
    const month = monthLabel(String(input.month));
    const day = (d: string) => DAYS[new Date(`${d}T00:00:00Z`).getUTCDay()] ?? "";
    const byPillar = out.pillars.map((p) => ({ name: p.name, count: out.posts.filter((x) => x.pillar === p.name).length }));
    return {
      name: `kalender-konten-${fileSlug(String(input.brand))}-${input.month}`,
      deckLabel: "PPT ringkasan konten",
      sheetLabel: "Excel kalender konten",
      deck: {
        title: clip(`Rencana Konten ${month}`, 90),
        subtitle: clip(String(input.brand), 160),
        theme: "coral",
        cover_style: "split",
        slides: [
          { layout: "quote", kicker: "ARAH BULAN INI", title: "Ringkasan", quote: clip(out.summary, 240) },
          {
            layout: "cards",
            kicker: "STRATEGI",
            title: "Tujuan, insight & sudut pandang",
            cards: [
              { icon: "target", title: "Tujuan", text: clip(out.strategy.objective, 160) },
              { icon: "lightbulb", title: "Insight audiens", text: clip(out.strategy.insight, 160) },
              { icon: "compass", title: "Sudut pandang", text: clip(out.strategy.angle, 160) },
            ],
          },
          {
            layout: "chart",
            kicker: "PILAR KONTEN",
            title: "Komposisi konten",
            subtitle: clip(out.pillars.map((p) => `${p.name}: ${p.purpose}`).join(" · "), 160),
            chart: { type: "doughnut", labels: out.pillars.map((p) => clip(p.name, 30)), series: [{ name: "Porsi", values: out.pillars.map((p) => Number(p.share_pct) || 0) }], unit: "%" },
          },
          {
            layout: "table",
            kicker: "MOMEN",
            title: "Tanggal penting",
            table: { headers: ["Tanggal", "Momen", "Ide"], rows: out.key_dates.slice(0, 7).map((k) => [clip(k.date, 60), clip(k.moment, 60), clip(k.idea, 60)]) },
          },
          ...weeks(out.posts)
            .slice(0, 5)
            .map(([w, week]) => ({
              layout: "table" as const,
              kicker: `MINGGU ${w}`,
              title: "Jadwal posting",
              table: {
                headers: ["Tanggal", "Platform", "Format", "Ide konten"],
                rows: week.map((p) => [clip(`${day(p.date).slice(0, 3)} ${p.date.slice(8)} · ${p.time}`, 60), clip(p.platform, 60), clip(p.format, 60), clip(p.title, 60)]),
              },
            })),
          {
            layout: "stats",
            kicker: "TARGET",
            title: "KPI bulan ini",
            stats: atLeast(
              out.kpis.slice(0, 4).map((k) => ({ value: clip(k.target, 12), label: clip(k.metric, 60) })),
              2,
              { value: `${out.posts.length}`, label: "Total posting" },
            ),
          },
          { layout: "closing", title: "Alur kerja produksi", bullets: out.workflow.slice(0, 6).map((w) => clip(w, 140)) },
        ],
      },
      sheets: [
        {
          name: "Kalender",
          title: `Kalender konten ${month} — ${input.brand}`,
          columns: [
            { header: "Tanggal", key: "date", width: 12 },
            { header: "Hari", key: "day", width: 9 },
            { header: "Jam", key: "time", width: 7 },
            { header: "Platform", key: "platform", width: 12 },
            { header: "Format", key: "format", width: 14 },
            { header: "Pilar", key: "pillar", width: 16 },
            { header: "Ide konten", key: "title", width: 32 },
            { header: "Hook", key: "hook", width: 40 },
            { header: "Caption", key: "caption", width: 70 },
            { header: "CTA", key: "cta", width: 24 },
            { header: "Hashtag", key: "hashtags", width: 30 },
            { header: "Arahan visual", key: "visual", width: 44 },
            { header: "Status", key: "status", width: 12 },
          ],
          rows: out.posts.map((p) => ({ ...p, day: day(p.date), hashtags: p.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "), status: "Draft" })),
        },
        {
          name: "Pilar & KPI",
          columns: [
            { header: "Pilar / KPI", key: "name", width: 26 },
            { header: "Tujuan / Target", key: "purpose", width: 60 },
            { header: "Porsi (%) / Jumlah", key: "share", width: 18 },
          ],
          rows: [
            ...out.pillars.map((p) => ({ name: p.name, purpose: p.purpose, share: `${p.share_pct}% (${byPillar.find((b) => b.name === p.name)?.count ?? 0} posting)` })),
            { name: "", purpose: "", share: "" },
            ...out.kpis.map((k) => ({ name: k.metric, purpose: k.target, share: "" })),
          ],
        },
        {
          name: "Tanggal penting",
          columns: [
            { header: "Tanggal", key: "date", width: 12 },
            { header: "Momen", key: "moment", width: 30 },
            { header: "Ide konten", key: "idea", width: 70 },
          ],
          rows: out.key_dates,
        },
      ],
    };
  },
};

/** Kelompokkan posting per minggu (tgl 1-7 = minggu 1, dst.). */
function weeks<T extends { date: string }>(list: T[]): [number, T[]][] {
  const map = new Map<number, T[]>();
  for (const p of list) {
    const w = Math.floor((Number(p.date.slice(8, 10)) - 1) / 7) + 1;
    map.set(w, [...(map.get(w) ?? []), p]);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

export const calendarRunner = makeRunner(calendarDef);
