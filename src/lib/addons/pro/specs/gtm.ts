import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { priority, t } from "./common";
import { CHANNEL_OPTIONS, budgetBasis } from "./plan";

export const gtmForm: ToolForm = {
  fields: [
    { type: "text", name: "brand", label: "Nama brand", max: 100, placeholder: "mis. Glowlab Skincare", half: true },
    { type: "text", name: "launch_date", label: "Rencana tanggal launching", max: 60, placeholder: "mis. 1 Desember 2026", half: true },
    {
      type: "textarea",
      name: "product",
      label: "Produk baru & keunggulannya *",
      required: true,
      min: 15,
      max: 1500,
      rows: 3,
      placeholder: "mis. Sunscreen stick SPF50 PA++++ 15g, tidak lengket & tidak whitecast, praktis re-apply di atas makeup. Sudah BPOM.",
    },
    {
      type: "textarea",
      name: "market",
      label: "Target pembeli *",
      required: true,
      min: 10,
      max: 800,
      rows: 2,
      placeholder: "mis. Perempuan 20-30 th, pekerja kantoran & mahasiswi di kota besar, aktif di luar ruangan, sudah pakai sunscreen tapi malas re-apply",
    },
    { type: "text", name: "price", label: "Rencana harga", max: 120, placeholder: "mis. Rp79rb (HPP Rp24rb)", half: true },
    { type: "text", name: "budget", label: "Budget peluncuran (total)", max: 120, placeholder: "mis. Rp50 jt untuk 3 bulan", half: true },
    {
      type: "chips",
      name: "channels",
      label: "Kanal jual & promosi yang tersedia",
      hint: "Kosongkan bila ingin direkomendasikan.",
      options: opts(CHANNEL_OPTIONS),
      defaults: ["tiktok", "marketplace", "kol"],
      min: 0,
    },
    { type: "textarea", name: "competitors", label: "Kompetitor / alternatif (opsional)", max: 600, rows: 2, placeholder: "mis. Azarine sunstick Rp55rb, Skin Aqua Rp65rb, Somethinc Rp99rb" },
  ],
  steps: [
    "Membaca produk & target pembeli…",
    "Menyusun value proposition & segmen prioritas…",
    "Menentukan positioning & strategi harga…",
    "Merencanakan fase pre-launch → launch → post-launch…",
    "Menyusun timeline, checklist tim & runbook hari-H…",
    "Membuat PPT GTM & Excel…",
  ],
};

export const gtmPhase = z.enum(["pre", "launch", "post"]);
export const GTM_PHASE_LABEL: Record<z.infer<typeof gtmPhase>, string> = { pre: "Pre-launch", launch: "Launch", post: "Post-launch" };
export const gtmTeam = z.enum(["marketing", "sales", "operasional", "cs"]);
export const TEAM_LABEL: Record<z.infer<typeof gtmTeam>, string> = { marketing: "Marketing", sales: "Sales", operasional: "Operasional", cs: "Customer service" };

export const gtmOutput = z.object({
  headline: t(160).describe("1 kalimat inti rencana peluncuran, berangka"),
  summary: t(600).describe("Ringkasan 3-4 kalimat: produk, untuk siapa, cara menang, target 90 hari"),
  assumptions: z.array(t(160)).describe("1-4 asumsi karena data kurang (kosongkan bila tidak ada)"),
  canvas: z.object({
    jobs: z.array(t(120)).describe("3-4 pekerjaan pelanggan (jobs-to-be-done)"),
    pains: z.array(t(120)).describe("3-4 pain"),
    gains: z.array(t(120)).describe("3-4 gain yang diharapkan"),
    products: z.array(t(120)).describe("2-4 produk/fitur yang ditawarkan"),
    relievers: z.array(t(120)).describe("3-4 pain reliever — pasangkan dengan pain"),
    creators: z.array(t(120)).describe("3-4 gain creator — pasangkan dengan gain"),
  }),
  icp: z
    .array(
      z.object({
        name: t(40).describe("Nama segmen yang mudah diingat"),
        profile: t(200),
        trigger: t(160).describe("Momen pemicu beli"),
        where: t(140).describe("Di mana mereka mencari & membeli"),
        priority: z.enum(["utama", "kedua", "nanti"]),
        why: t(160).describe("Kenapa prioritas ini"),
      }),
    )
    .describe("2-3 segmen, tepat 1 berprioritas utama"),
  positioning: z.object({
    statement: t(400).describe("Untuk … yang …, [produk] adalah … yang … karena …"),
    versus: t(240).describe("Kenapa pilih kita dibanding alternatif utama, jujur & spesifik"),
  }),
  pricing: z.object({
    recommended: z.number().nullable().describe("Harga normal rekomendasi (Rupiah penuh)"),
    anchor: t(200).describe("Strategi anchor: harga pembanding/coret, bundling, atau tier mahal sebagai jangkar"),
    tiers: z
      .array(z.object({ name: t(40), price: z.number().nullable(), contents: t(140), role: t(60).describe("Peran tier: entry, best seller, anchor") }))
      .describe("2-3 tier/paket"),
    intro_offer: t(200).describe("Penawaran perkenalan: mekanik, besaran, kuota/tenggat"),
    rationale: t(320).describe("Alasan harga: posisi vs kompetitor, margin, psikologi harga"),
    margin_note: t(200).describe("Catatan margin/impas bila HPP diketahui; selain itu kosong"),
  }),
  channels: z
    .array(
      z.object({
        channel: t(40),
        role: t(140),
        tactics: z.array(t(140)).describe("2-3 taktik spesifik"),
        phase: z.enum(["pre", "launch", "post", "semua"]),
        kpi: t(60),
      }),
    )
    .describe("4-6 kanal, urut dari terpenting"),
  phases: z
    .array(
      z.object({
        phase: gtmPhase,
        duration: t(40).describe("mis. '4 minggu (3-30 Nov)'"),
        goal: t(160),
        activities: z.array(t(140)).describe("3-6 aktivitas"),
        kpis: z.array(t(80)).describe("2-3 KPI fase"),
      }),
    )
    .describe("Tepat 3 fase: pre, launch, post"),
  timeline: z
    .array(
      z.object({
        week: z.number().describe("Minggu relatif terhadap launch: negatif = sebelum, 0 = minggu launch, positif = sesudah"),
        activity: t(160),
        owner: t(40).describe("PIC (peran)"),
      }),
    )
    .describe("10-20 aktivitas per minggu dari ±minggu -4 sampai +6"),
  checklist: z
    .array(z.object({ team: gtmTeam, task: t(140), due: t(30).describe("mis. 'H-14'") }))
    .describe("12-20 tugas, 3-5 per tim (marketing, sales, operasional, cs)"),
  runbook: z
    .array(z.object({ time: t(5).describe("HH.MM"), activity: t(160), owner: t(40), note: t(120).describe("Catatan/cadangan bila gagal") }))
    .describe("8-14 baris jadwal hari-H launch dari pagi sampai malam"),
  kpis: z.array(z.object({ metric: t(50), target: t(40), when: t(40).describe("Kapan diukur, mis. '30 hari pasca launch'") })).describe("4-6 KPI peluncuran"),
  budget: z.object({
    total: z.number().nullable().describe("Total budget peluncuran (Rupiah penuh) dari isian user; bila kosong, rekomendasi realistis"),
    basis: budgetBasis,
    items: z.array(z.object({ item: t(50), pct: z.number(), amount: z.number().nullable().describe("Dihitung program"), note: t(140) })).describe("4-6 pos budget, total 100%"),
  }),
  risks: z.array(z.object({ risk: t(140), likelihood: priority, mitigation: t(200) })).describe("3-5 risiko peluncuran & mitigasinya"),
});

export type GtmOutput = z.infer<typeof gtmOutput>;

/** Label minggu relatif terhadap launch. */
export const weekLabel = (w: number) => (w === 0 ? "Minggu launch" : w < 0 ? `Minggu −${-w}` : `Minggu +${w}`);

const BULAN = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];
/** Baca tanggal launching ("1 Desember 2026", "2026-12-01", "1/12/2026") → Date UTC atau null. */
export function parseLaunchDate(text: unknown, now = new Date()): Date | null {
  const s = String(text ?? "").toLowerCase();
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) return valid(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = s.match(/(\d{1,2})\s+([a-z]+)\.?\s*(\d{4})?/);
  if (m) {
    const mi = BULAN.findIndex((b) => m![2].startsWith(b) || (b === "agu" && m![2].startsWith("aug")) || (b === "mei" && m![2].startsWith("may")));
    if (mi >= 0) {
      let y = m[3] ? +m[3] : now.getUTCFullYear();
      if (!m[3] && Date.UTC(y, mi, +m[1]) < now.getTime()) y += 1;
      return valid(y, mi + 1, +m[1]);
    }
  }
  return null;
}
function valid(y: number, mo: number, d: number) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

/** Tanggal mulai minggu relatif (minggu 0 = minggu yang memuat tanggal launch, mulai Senin). */
export function weekStart(launch: Date, w: number) {
  const monday = new Date(launch.getTime() - ((launch.getUTCDay() + 6) % 7) * 86_400_000);
  const d = new Date(monday.getTime() + w * 7 * 86_400_000);
  return `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][d.getUTCMonth()]}`;
}
