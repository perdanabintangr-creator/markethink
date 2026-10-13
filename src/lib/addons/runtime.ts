import "server-only";
import { generateObject, type ModelMessage } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { routeTier } from "@/lib/ai/router";
import { estimateCostUsd } from "@/lib/ai/models.config";
import { buildPresentation, presentationSchema } from "@/lib/pptx";
import { sanitizeFileName } from "@/lib/files";

export interface ToolCtx {
  admin: SupabaseClient;
  userId: string;
  runId: string;
  /** Akumulasi biaya AI (USD) selama tool berjalan. */
  cost: { usd: number; model: string | null };
}

export interface ToolFile {
  id: string;
  name: string;
  mime: string;
  kind: "pptx" | "xlsx";
  label: string;
}

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** Panggil AI (otak Senior) dan minta hasil terstruktur sesuai skema. */
export async function aiObject<T extends z.ZodTypeAny>(
  ctx: ToolCtx,
  opts: { schema: T; system: string; prompt?: string; messages?: ModelMessage[]; vision?: boolean; maxOutputTokens?: number },
): Promise<z.infer<T>> {
  const routed = routeTier("senior", { needsVision: opts.vision });
  const base = { model: routed.model, schema: opts.schema, system: opts.system, maxOutputTokens: opts.maxOutputTokens ?? 8000, maxRetries: 1 };
  const result = opts.messages
    ? await generateObject({ ...base, messages: opts.messages })
    : await generateObject({ ...base, prompt: opts.prompt ?? "" });
  addCost(ctx, routed.resolved(), result.usage);
  return result.object as z.infer<T>;
}

export function addCost(
  ctx: ToolCtx,
  candidate: Parameters<typeof estimateCostUsd>[0] | null,
  usage: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } | undefined,
) {
  if (!candidate) return;
  ctx.cost.model = `${candidate.provider}:${candidate.modelId}`;
  ctx.cost.usd += estimateCostUsd(candidate, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0, { read: usage?.cachedInputTokens ?? 0 });
}

/** Simpan file hasil tool ke Storage + tabel attachments (diunduh lewat /api/attachments/:id). */
export async function storeToolFile(ctx: ToolCtx, name: string, kind: "pptx" | "xlsx", bytes: Uint8Array, label: string): Promise<ToolFile> {
  const id = crypto.randomUUID();
  const clean = sanitizeFileName(name).replace(/\s+/g, "-") || `markethink.${kind}`;
  const mime = kind === "pptx" ? PPTX_MIME : XLSX_MIME;
  const path = `${ctx.userId}/generated/tools/${id}-${clean}`;
  const { error: upErr } = await ctx.admin.storage.from("uploads").upload(path, bytes, { contentType: mime });
  if (upErr) throw new Error(`upload file gagal: ${upErr.message}`);
  const { error } = await ctx.admin.from("attachments").insert({
    id,
    user_id: ctx.userId,
    name: clean,
    mime,
    size: bytes.byteLength,
    storage_path: path,
    extracted_text: null,
  });
  if (error) throw new Error(`simpan file gagal: ${error.message}`);
  return { id, name: clean, mime, kind, label };
}

/** Potong teks agar muat di slide/sel. */
export const clip = (v: unknown, n: number) => {
  const str = String(v ?? "").replace(/\s+/g, " ").trim();
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
};

/** Bangun file PPT dari slide yang disusun program (bukan AI) — memakai mesin desain PPT Markethink. */
export async function makeDeck(deck: unknown) {
  const parsed = presentationSchema.safeParse(deck);
  if (!parsed.success) throw new Error(`susun PPT gagal: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
  return buildPresentation(parsed.data, {});
}

export interface SheetSpec {
  name: string;
  columns: { header: string; key: string; width?: number; money?: boolean; wrap?: boolean }[];
  rows: Record<string, string | number | null | undefined>[];
  /** Warna latar baris (hex tanpa #) — mis. status iklan. */
  rowColor?: (row: Record<string, unknown>) => string | null;
  /** Judul di atas tabel. */
  title?: string;
}

/** Excel rapi: judul, header berwarna, kolom lebar otomatis, angka Rupiah, baris berwarna. */
export async function makeWorkbook(sheets: SheetSpec[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Markethink";
  for (const spec of sheets) {
    const ws = wb.addWorksheet(spec.name.slice(0, 31).replace(/[\\/*?:[\]]/g, " "));
    let headerRow = 1;
    if (spec.title) {
      ws.addRow([spec.title]).font = { bold: true, size: 14 };
      ws.addRow([]);
      headerRow = 3;
    }
    const header = ws.addRow(spec.columns.map((c) => c.header));
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D5CE7" } };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
    for (const r of spec.rows) {
      const row = ws.addRow(spec.columns.map((c) => r[c.key] ?? ""));
      const color = spec.rowColor?.(r);
      row.eachCell((cell, col) => {
        const def = spec.columns[col - 1];
        cell.alignment = { vertical: "top", wrapText: def?.wrap ?? true };
        if (def?.money && typeof cell.value === "number") cell.numFmt = '"Rp"#,##0';
        if (color) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } };
      });
    }
    spec.columns.forEach((c, i) => {
      ws.getColumn(i + 1).width = c.width ?? 24;
    });
    ws.views = [{ state: "frozen", ySplit: headerRow }];
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

export const fileSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "markethink";
