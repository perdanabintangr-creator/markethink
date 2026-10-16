import { TOOLS, type ToolId } from "@/lib/addons/catalog";

/**
 * Tools yang bisa dipakai Markethink Agent. Dikecualikan: kalkulator (bukan AI) dan tools yang wajib
 * membaca data performa milik user (laporan iklan/bulanan/KOL) — itu tetap dijalankan manual dengan upload file.
 */
export const AGENT_EXCLUDED: ToolId[] = ["calc", "ads", "report", "kolreport"];
export const AGENT_TOOLS = TOOLS.filter((t) => !t.noQuota && !AGENT_EXCLUDED.includes(t.id));
export const AGENT_TOOL_IDS = AGENT_TOOLS.map((t) => t.id) as [ToolId, ...ToolId[]];

/** Batas langkah per misi agar tetap cepat & hemat kuota. */
export const AGENT_MAX_STEPS = 5;

export type AgentStepStatus = "pending" | "running" | "ok" | "error" | "skipped";
export interface AgentStep {
  tool: ToolId;
  why: string;
  status: AgentStepStatus;
  run_id?: string | null;
  error?: string | null;
  started_at?: string | null;
}

export interface AgentRunLite {
  id: string;
  goal: string;
  context: string;
  title: string | null;
  plan: AgentStep[];
  status: "planned" | "running" | "done" | "error";
  summary: string | null;
  chat_id: string | null;
  created_at: string;
  /** Otak yang dipakai misi ini (null = Senior). */
  tier?: "senior" | "associate" | "director" | null;
}

/** Contoh misi di halaman Agent. */
export const AGENT_EXAMPLES = [
  "Siapkan kampanye Ramadan untuk toko hijab online saya, target perempuan 20–35 tahun, budget iklan Rp5 juta.",
  "Saya mau launching produk kopi susu literan bulan depan di Bandung. Siapkan strategi peluncuran sampai konten sebulan.",
  "Riset pasar & persona untuk bisnis photobox di Jakarta, lalu buatkan rencana konten TikTok yang bisa viral.",
  "Naikkan repeat order pelanggan klinik kecantikan saya: program loyalitas, alur follow-up WhatsApp, dan promo.",
];
