/** Kurs perkiraan USD → IDR untuk dashboard internal (bisa diatur via env USD_IDR_RATE). */
export const USD_IDR = Number(process.env.USD_IDR_RATE) || 17_000;

const nf = new Intl.NumberFormat("id-ID");
export const num = (v: number | string | null | undefined) => nf.format(Number(v ?? 0));
export const usd = (v: number | string | null | undefined) => `$${Number(v ?? 0).toFixed(2)}`;
export const idr = (usdValue: number | string | null | undefined) => `Rp${nf.format(Math.round(Number(usdValue ?? 0) * USD_IDR))}`;
export const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");

export const PLAN_NAME: Record<string, string> = { beta: "Free", pro: "Pro", promax: "Promax" };

export const COST_CATEGORY: Record<string, string> = {
  "chat:junior": "Chat · Junior (Haiku/Gemini)",
  "chat:senior": "Chat · Senior (Sonnet)",
  "chat:associate": "Chat · Associate (Opus)",
  "chat:director": "Chat · Director (Fable)",
  web_search: "Pencarian web",
  image: "Gambar di chat",
  deck_image: "Foto di PPT",
  pptx: "Pembuatan PPT",
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
