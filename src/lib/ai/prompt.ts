import { readFile } from "fs/promises";
import path from "path";

export interface BrandKit {
  brand_name?: string;
  products?: string;
  target_audience?: string;
  brand_voice?: string;
  usp?: string;
  competitors?: string;
  channels?: string;
  budget_range?: string;
  notes?: string;
}

export const BRAND_KIT_FIELDS: { key: keyof BrandKit; label: string }[] = [
  { key: "brand_name", label: "Nama brand" },
  { key: "products", label: "Produk/jasa" },
  { key: "target_audience", label: "Target audience" },
  { key: "brand_voice", label: "Brand voice" },
  { key: "usp", label: "USP" },
  { key: "competitors", label: "Kompetitor" },
  { key: "channels", label: "Channel aktif" },
  { key: "budget_range", label: "Budget range" },
  { key: "notes", label: "Catatan lain" },
];

export interface PromptContext {
  role?: string | null;
  industry?: string | null;
  experience?: string | null;
  language?: "id" | "en" | null;
  brandKit?: BrandKit | null;
  memories?: string[];
}

let cachedTemplate: string | null = null;

export async function loadSystemTemplate() {
  if (cachedTemplate && process.env.NODE_ENV === "production") return cachedTemplate;
  cachedTemplate = await readFile(path.join(process.cwd(), "prompts", "system.md"), "utf8");
  return cachedTemplate;
}

export function formatBrandKit(kit: BrandKit | null | undefined) {
  if (!kit) return "Belum ada Brand Kit aktif. Jika relevan, tanyakan info brand seperlunya.";
  const lines = BRAND_KIT_FIELDS.filter((f) => kit[f.key]?.trim()).map(
    (f) => `- ${f.label}: ${kit[f.key]!.trim()}`,
  );
  return lines.length ? lines.join("\n") : "Brand Kit masih kosong.";
}

export function fillTemplate(template: string, ctx: PromptContext) {
  const vars: Record<string, string> = {
    role: ctx.role || "belum diisi",
    industry: ctx.industry || "belum diisi",
    experience: ctx.experience || "belum diisi",
    brand_kit: formatBrandKit(ctx.brandKit),
    memory: ctx.memories?.length
      ? ctx.memories.map((m) => `- ${m}`).join("\n")
      : "Belum ada.",
    language: ctx.language === "en" ? "English" : "Bahasa Indonesia",
  };
  return template.replace(/\{(role|industry|experience|brand_kit|memory|language)\}/g, (_, k: string) => vars[k]);
}

/** Bungkus konten eksternal sebagai data — guard prompt injection dasar. */
export function untrusted(label: string, content: string) {
  const safe = content.replace(/<\/?untrusted_data[^>]*>/gi, "");
  return `<untrusted_data source="${label.replace(/"/g, "'")}">\n${safe}\n</untrusted_data>`;
}

export async function buildSystemPrompt(
  ctx: PromptContext,
  extras: { tierInstructions?: string | null; agentInstructions?: string | null; knowledge?: string | null; research?: string | null } = {},
) {
  const parts = [fillTemplate(await loadSystemTemplate(), ctx)];
  if (extras.tierInstructions) parts.push(`## Level otak\n${extras.tierInstructions}`);
  if (extras.agentInstructions) parts.push(`## Mode agent\n${extras.agentInstructions}`);
  if (extras.knowledge) {
    parts.push(
      `## Knowledge workspace (hasil pencarian dokumen user)\nGunakan bila relevan; sebut nama dokumennya.\n${extras.knowledge}`,
    );
  }
  if (extras.research) {
    parts.push(
      `## Hasil Riset Web\nJawab berdasarkan sumber berikut. Kutip dengan nomor [n] sesuai urutan sumber. Jangan mengutip sumber yang tidak ada di daftar.\n${extras.research}`,
    );
  }
  return parts.join("\n\n");
}
