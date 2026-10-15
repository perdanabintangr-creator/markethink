/**
 * Ubah hasil Tools Pro (JSON terstruktur) menjadi dokumen Markdown yang enak dibaca di chat — dipakai fitur "Bahas di Chat".
 * Generik untuk semua tool: objek → subjudul, daftar objek datar → tabel, daftar teks → poin.
 */

const LABELS: Record<string, string> = {
  summary: "Ringkasan",
  headline: "Kesimpulan",
  kpis: "KPI",
  channels: "Kanal",
  recommendations: "Rekomendasi",
  sources: "Sumber",
  research_notes: "Temuan riset lengkap",
  risks: "Risiko",
  budget: "Budget",
  roadmap: "Roadmap",
  objectives: "Tujuan",
  insights: "Insight",
  next_month: "Rencana bulan depan",
  data_notes: "Catatan data",
  swot: "SWOT",
  strengths: "Kekuatan",
  weaknesses: "Kelemahan",
  opportunities: "Peluang",
  threats: "Ancaman",
  quick_wins: "Quick wins",
  pillars: "Pilar",
  posts: "Posting",
  actions: "Aksi",
  timeline: "Timeline",
  deliverables: "Deliverables",
  action: "Aksi",
  activities: "Aktivitas",
  activity: "Aktivitas",
  after: "Sesudah",
  amount: "Nominal",
  anchor: "Harga jangkar",
  angle: "Angle",
  angles: "Angle",
  answer: "Jawaban",
  archetype: "Archetype",
  archetype_note: "Catatan archetype",
  aspect: "Aspek",
  aspects: "Aspek penilaian",
  assets: "Aset",
  assumptions: "Asumsi",
  audience: "Audiens",
  audio: "Audio",
  avoid: "Hindari",
  background: "Latar belakang",
  baseline: "Kondisi awal",
  basis: "Dasar",
  behaviors: "Perilaku",
  benefits: "Benefit",
  best_time: "Waktu terbaik",
  big_idea: "Big idea",
  bio_options: "Opsi bio",
  body: "Isi",
  body_font: "Font isi",
  boilerplate: "Tentang perusahaan",
  bonus_rules: "Aturan bonus",
  budget_pct: "Porsi budget (%)",
  budget_split: "Pembagian budget",
  budget_total: "Total budget",
  burn_rule: "Aturan tukar",
  campaigns: "Campaign",
  canvas: "Value proposition canvas",
  caption: "Caption",
  channel: "Kanal",
  checklist: "Checklist",
  clicks: "Klik",
  code: "Kode",
  cogs: "HPP",
  comments: "Komentar",
  comms: "Materi komunikasi",
  compliance: "Kepatuhan",
  condition: "Kondisi",
  content: "Konten",
  conversion_rate: "Konversi",
  core: "Inti",
  cost: "Biaya",
  creators: "Kreator",
  current: "Sekarang",
  customers: "Pelanggan",
  date: "Tanggal",
  dateline: "Dateline",
  deadline: "Tenggat",
  delay: "Jeda",
  description: "Deskripsi",
  desired: "Yang diinginkan",
  detail: "Detail",
  direction: "Arahan",
  discount: "Diskon",
  discount_pct: "Diskon (%)",
  distribution: "Distribusi",
  donts: "Hindari",
  dos: "Lakukan",
  due: "Tenggat",
  duration: "Durasi",
  economics: "Hitungan ekonomi",
  editing: "Editing",
  embargo: "Embargo",
  end: "Selesai",
  engagements: "Engagement",
  essence: "Brand essence",
  event: "Event",
  evidence: "Bukti",
  example: "Contoh",
  execution: "Eksekusi",
  exit: "Kondisi keluar",
  expiry: "Masa berlaku",
  fee: "Fee",
  finding: "Temuan",
  fix: "Perbaikan",
  focus: "Fokus",
  followers: "Followers",
  format: "Format",
  formats: "Format",
  frequency: "Frekuensi",
  funnel: "Funnel",
  gains: "Gains",
  goal: "Tujuan",
  guideline: "Panduan",
  hashtags: "Hashtag",
  heading_font: "Font judul",
  headlines: "Headline",
  highlight: "Sorotan",
  highlights: "Sorotan",
  hook: "Hook",
  hooks: "Hook",
  how: "Cara",
  icp: "Pelanggan ideal (ICP)",
  idea: "Ide",
  impact: "Dampak",
  implication: "Implikasi",
  insight: "Insight",
  intro_offer: "Penawaran perkenalan",
  issue: "Masalah",
  issues: "Masalah",
  item: "Item",
  items: "Item",
  jobs: "Jobs-to-be-done",
  keep: "Pertahankan",
  key_dates: "Tanggal penting",
  key_message: "Pesan utama",
  kpi: "KPI",
  launch: "Peluncuran",
  lessons: "Pelajaran",
  level: "Level",
  likelihood: "Peluang terjadi",
  likes: "Likes",
  logo_do: "Logo — lakukan",
  logo_dont: "Logo — hindari",
  mandatories: "Wajib",
  margin_pct: "Margin (%)",
  margin_rp: "Margin (Rp)",
  margins: "Hitungan margin",
  meaning: "Arti",
  measurement: "Pengukuran",
  mechanism: "Mekanisme",
  media_contact: "Kontak media",
  media_targets: "Sasaran media",
  message: "Pesan",
  messages: "Pesan",
  messaging: "Messaging house",
  metric: "Metrik",
  milestone: "Milestone",
  min_spend: "Minimal belanja",
  mission: "Misi",
  mitigation: "Mitigasi",
  model: "Model",
  moment: "Momen",
  name: "Nama",
  need: "Kebutuhan",
  next_step: "Langkah berikutnya",
  next_wave: "Gelombang berikutnya",
  note: "Catatan",
  notes: "Catatan",
  objective: "Tujuan",
  orders: "Order",
  owner: "PIC",
  pains: "Pains",
  palette: "Palet warna",
  period: "Periode",
  personality: "Kepribadian",
  phase: "Fase",
  phases: "Fase",
  photography: "Gaya foto",
  pillar: "Pilar",
  plan: "Rencana",
  platform: "Platform",
  platforms: "Platform",
  positioning: "Positioning",
  price: "Harga",
  pricing: "Strategi harga",
  primary: "Utama",
  primary_text: "Primary text",
  priority: "Prioritas",
  problem: "Masalah",
  product: "Produk",
  products: "Produk",
  promise: "Brand promise",
  promo_price: "Harga promo",
  proof: "Bukti",
  proposition: "Proposition",
  purpose: "Tujuan",
  qa: "Tanya-jawab wartawan",
  qty: "Jumlah",
  question: "Pertanyaan",
  quotes: "Kutipan",
  rationale: "Alasan",
  reason: "Alasan",
  recommended: "Rekomendasi",
  relievers: "Pain relievers",
  requirement: "Syarat",
  result: "Hasil",
  revenue: "Pendapatan",
  reward: "Hadiah",
  rewards: "Hadiah",
  risk: "Risiko",
  role: "Peran",
  rtb: "Reasons to believe",
  rule: "Aturan",
  rules: "Aturan",
  runbook: "Runbook hari-H",
  saves: "Saves",
  say: "Katakan",
  scenario: "Skenario",
  scenarios: "Skenario",
  scenes: "Adegan",
  score: "Skor",
  score_total: "Skor total",
  scripts: "Naskah",
  secondary: "Sekunder",
  segment: "Segmen",
  segment_note: "Catatan segmen",
  segments: "Segmen",
  setup: "Setup",
  share: "Porsi",
  share_pct: "Porsi (%)",
  shot: "Shot",
  situation: "Analisis situasi",
  so_what: "Artinya",
  social: "Versi media sosial",
  speaker: "Narasumber",
  spend: "Biaya",
  stage: "Tahap",
  stages: "Tahap",
  start: "Mulai",
  statement: "Pernyataan",
  status: "Status",
  stock: "Stok",
  stop: "Hentikan",
  strategy: "Strategi",
  structure: "Struktur",
  style: "Gaya",
  subject: "Subjek",
  subtitle: "Subjudul",
  success: "Ukuran sukses",
  support: "Dukungan",
  tactics: "Taktik",
  taglines: "Opsi tagline",
  target: "Target",
  task: "Tugas",
  team: "Tim",
  test_plan: "Rencana tes",
  tests: "Tes",
  text: "Teks",
  theme: "Tema",
  time: "Waktu",
  timing: "Waktu",
  tips: "Tips",
  title: "Judul",
  to_verify: "Perlu dicek",
  tone: "Tone",
  total: "Total",
  trigger: "Pemicu",
  type: "Jenis",
  unit: "Unit",
  usage: "Penggunaan",
  value: "Nilai",
  values: "Nilai brand",
  variants: "Variasi",
  verdict: "Penilaian",
  views: "Views",
  vision: "Visi",
  visual: "Visual",
  voice_examples: "Contoh suara",
  voice_over: "Voice over",
  vouchers: "Voucher",
  week: "Minggu",
  when: "Kapan",
  where: "Di mana",
  why: "Alasan",
  wins: "Yang berhasil",
  word_bank: "Word bank",
  words: "Kata",
  workflow: "Alur kerja",
};

const label = (key: string) =>
  LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/, (c) => c.toUpperCase());

const isPrimitive = (v: unknown) => v === null || ["string", "number", "boolean"].includes(typeof v);
const fmt = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "number") return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(v);
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  return String(v).replace(/\s*\n\s*/g, " ");
};
const cell = (v: unknown) => {
  const s = Array.isArray(v) ? v.filter(isPrimitive).map(fmt).join(", ") : fmt(v);
  return (s.length > 140 ? `${s.slice(0, 139)}…` : s).replace(/\|/g, "/");
};

function table(rows: Record<string, unknown>[]) {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))]
    .filter((k) => rows.some((r) => r[k] !== null && r[k] !== undefined && r[k] !== ""))
    .slice(0, 7);
  const head = `| ${keys.map(label).join(" | ")} |\n| ${keys.map(() => "---").join(" | ")} |`;
  return `${head}\n${rows.map((r) => `| ${keys.map((k) => cell(r[k])).join(" | ")} |`).join("\n")}`;
}

/** Objek "datar" = isinya teks/angka atau daftar teks pendek → cocok jadi baris tabel. */
const flat = (o: Record<string, unknown>) =>
  Object.values(o).every((v) => isPrimitive(v) || (Array.isArray(v) && v.every(isPrimitive) && v.length <= 6));

function render(value: unknown, depth: number): string {
  if (isPrimitive(value)) return fmt(value);
  if (Array.isArray(value)) {
    if (!value.length) return "-";
    if (value.every(isPrimitive)) return value.map((v) => `- ${fmt(v)}`).join("\n");
    const objs = value.filter((v): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v));
    if (objs.length && objs.every(flat)) return table(objs);
    return objs
      .map((o, i) => {
        const lines = Object.entries(o).map(([k, v]) =>
          isPrimitive(v) || (Array.isArray(v) && v.every(isPrimitive)) ? `   - **${label(k)}:** ${cell(v)}` : `   - **${label(k)}:**\n${indent(render(v, depth + 1))}`,
        );
        return `${i + 1}. ${lines.join("\n").trimStart().replace(/^- /, "")}`;
      })
      .join("\n");
  }
  const obj = value as Record<string, unknown>;
  const heading = "#".repeat(Math.min(6, depth + 2));
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => (isPrimitive(v) ? `**${label(k)}:** ${fmt(v)}` : `${heading} ${label(k)}\n\n${render(v, depth + 1)}`))
    .join("\n\n");
}

const indent = (s: string) =>
  s
    .split("\n")
    .map((l) => `      ${l}`)
    .join("\n");

export function resultToMarkdown(output: unknown, maxChars = 24_000) {
  if (!output || typeof output !== "object") return "";
  const { sources, research_notes, ...rest } = output as Record<string, unknown> & { sources?: { title: string; url: string }[] };
  let md = render(rest, 0);
  // Temuan riset lengkap di akhir agar isi utama tidak terpotong lebih dulu.
  if (typeof research_notes === "string" && research_notes.trim()) md += `\n\n## Temuan riset lengkap\n\n${research_notes.slice(0, 10_000)}`;
  if (Array.isArray(sources) && sources.length) {
    md += `\n\n## Sumber\n\n${sources
      .slice(0, 30)
      .map((s, i) => `${i + 1}. [${s.title || s.url}](${s.url})`)
      .join("\n")}`;
  }
  return md.length > maxChars ? `${md.slice(0, maxChars)}\n\n_(dipotong — lihat halaman hasil untuk versi lengkap)_` : md;
}
