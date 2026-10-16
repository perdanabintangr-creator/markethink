/** Kurs perkiraan USD → IDR untuk dashboard internal (bisa diatur via env USD_IDR_RATE). */
export const USD_IDR = Number(process.env.USD_IDR_RATE) || 17_000;

const nf = new Intl.NumberFormat("id-ID");
export const num = (v: number | string | null | undefined) => nf.format(Number(v ?? 0));
export const usd = (v: number | string | null | undefined) => `$${Number(v ?? 0).toFixed(2)}`;
export const idr = (usdValue: number | string | null | undefined) => `Rp${nf.format(Math.round(Number(usdValue ?? 0) * USD_IDR))}`;
export const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");

export const PLAN_NAME: Record<string, string> = { beta: "Free", starter: "Starter", pro: "Pro", promax: "Promax" };

export const COST_CATEGORY: Record<string, string> = {
  "chat:junior": "Chat · Junior (Haiku/Gemini)",
  "chat:senior": "Chat · Senior (Sonnet)",
  "chat:associate": "Chat · Associate (Opus)",
  "chat:director": "Chat · Director (Fable)",
  web_search: "Pencarian web",
  image: "Gambar di chat",
  deck_image: "Foto di PPT",
  pptx: "Pembuatan PPT",
  "tool:listing": "Tools · Listing marketplace",
  "tool:live": "Tools · Skrip live selling",
  "tool:whatsapp": "Tools · Template WhatsApp",
  "tool:ads": "Tools · Analis laporan iklan",
  "tool:competitor": "Tools · Riset kompetitor",
  "tool:kol": "Tools · Brief KOL",
  "tool:sizing": "Tools · Ukuran & tren pasar",
  "tool:persona": "Tools · Persona konsumen",
  "tool:entry": "Tools · Studi kelayakan",
  "tool:survey": "Tools · Desain survei",
  "tool:plan": "Tools · Marketing plan",
  "tool:brand": "Tools · Brand guideline",
  "tool:campaign": "Tools · Campaign brief",
  "tool:gtm": "Tools · Peluncuran produk",
  "tool:calendar": "Tools · Kalender konten",
  "tool:script": "Tools · Naskah video",
  "tool:audit": "Tools · Audit akun sosmed",
  "tool:adcopy": "Tools · Variasi iklan",
  "tool:promo": "Tools · Kalender promo",
  "tool:flow": "Tools · Alur follow-up",
  "tool:loyalty": "Tools · Program loyalty",
  "tool:kolreport": "Tools · Laporan KOL",
  "tool:press": "Tools · Siaran pers",
  "tool:report": "Tools · Laporan bulanan",
  tool_chat: "Tools · Diskusi hasil",
};

export const ADDON_NAME: Record<string, string> = {
  strategi_pro: "Strategi & Brand",
  riset_pro: "Market Research Pro",
  konten_pro: "Konten & Sosmed",
  dokter_iklan: "Iklan & Performance",
  jualan_kit: "Jualan Online",
  crm_pro: "CRM & Retensi",
  kolpr_pro: "KOL & PR",
  laporan_pro: "Laporan Marketing",
};

export const FEATURE_NAME: Record<string, string> = {
  chat: "Chat",
  web_search: "Pencarian web",
  image: "Gambar AI",
  pptx: "PPT",
  upload: "Upload file",
  project: "Project baru",
  knowledge_file: "Dokumen project",
  canvas: "Canvas",
  share: "Chat dibagikan",
  feedback_up: "Feedback 👍",
  feedback_down: "Feedback 👎",
};
