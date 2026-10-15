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
  /** Revisi: perbaiki hasil sebelumnya sesuai koreksi user (tidak memotong kuota). */
  revision?: { note: string; previous: unknown };
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

type AnySlide = Record<string, unknown> & { layout: string; title?: string };

/**
 * Perbaiki slide yang datanya kurang agar lolos aturan mesin PPT (mis. grafik dengan 1 data, kartu tunggal):
 * slide diubah menjadi poin-poin, atau dibuang bila kosong. Hasil AI yang tipis tidak boleh menggagalkan seluruh laporan.
 */
export function sanitizeDeck(deck: { slides: AnySlide[] } & Record<string, unknown>) {
  const toBullets = (s: AnySlide, items: string[]): AnySlide | null => {
    const bullets = items.map((b) => clip(b, 140)).filter(Boolean).slice(0, 6);
    return bullets.length ? { layout: "bullets", kicker: s.kicker, title: s.title ?? "Ringkasan", subtitle: s.subtitle, bullets } : null;
  };
  const fixed: AnySlide[] = [];
  for (const raw of deck.slides) {
    let s: AnySlide | null = { ...raw };
    switch (s.layout) {
      case "chart": {
        const chart = s.chart as { type: string; labels: string[]; series: { name: string; values: number[] }[] } | undefined;
        if (!chart || chart.labels.length < 2) {
          s = toBullets(s, [
            ...(chart?.labels ?? []).map((l, i) => `${l}: ${chart?.series[0]?.values[i] ?? ""}`),
            ...((s.bullets as string[] | undefined) ?? []),
          ]);
          break;
        }
        const labels = chart.labels.slice(0, 12);
        const single = chart.type === "pie" || chart.type === "doughnut";
        const series = chart.series.slice(0, single ? 1 : 3).map((x) => ({
          ...x,
          values: labels.map((_, i) => (Number.isFinite(x.values[i]) ? x.values[i] : 0)),
        }));
        s.chart = { ...chart, labels, series };
        if (Array.isArray(s.bullets)) s.bullets = (s.bullets as string[]).slice(0, 6);
        break;
      }
      case "cards": {
        const cards = (s.cards as { title: string; text: string }[] | undefined) ?? [];
        if (cards.length < 2) s = toBullets(s, cards.map((c) => `${c.title}: ${c.text}`));
        else s.cards = cards.slice(0, 6);
        break;
      }
      case "stats": {
        const stats = (s.stats as { value: string; label: string }[] | undefined) ?? [];
        if (stats.length < 2) s = toBullets(s, [...stats.map((x) => `${x.label}: ${x.value}`), ...((s.bullets as string[] | undefined) ?? [])]);
        else s.stats = stats.slice(0, 4);
        break;
      }
      case "timeline": {
        const steps = (s.steps as { title: string; text: string }[] | undefined) ?? [];
        if (steps.length < 3) s = toBullets(s, steps.map((x) => `${x.title}: ${x.text}`));
        else s.steps = steps.slice(0, 6);
        break;
      }
      case "comparison": {
        const cols = (s.columns as { heading: string; bullets: string[] }[] | undefined) ?? [];
        if (cols.length !== 2) s = toBullets(s, cols.flatMap((c) => c.bullets));
        else s.columns = cols.map((c) => ({ heading: c.heading, bullets: c.bullets.slice(0, 5) }));
        break;
      }
      case "table": {
        const t = s.table as { headers: string[]; rows: string[][] } | undefined;
        if (!t || t.headers.length < 2 || !t.rows.length) {
          s = null;
          break;
        }
        const headers = t.headers.slice(0, 5);
        s.table = { headers, rows: t.rows.slice(0, 7).map((r) => headers.map((_, i) => clip(r[i] ?? "", 60))) };
        break;
      }
      case "bullets":
      case "closing":
      case "agenda": {
        const b = ((s.bullets as string[] | undefined) ?? []).filter(Boolean).slice(0, 6);
        if (!b.length && s.layout === "bullets") s = null;
        else s.bullets = b;
        break;
      }
    }
    if (s) fixed.push(s);
  }
  while (fixed.length < 3) fixed.push({ layout: "closing", title: "Terima kasih", bullets: ["Dibuat dengan Markethink Tools Pro"] });
  return { ...deck, slides: fixed.slice(0, 20) };
}

/**
 * Bangun file PPT dari slide yang disusun program (bukan AI) — memakai mesin desain PPT Markethink.
 * Tidak pernah melempar error: bila gagal, kembalikan null (hasil & Excel tetap jadi).
 */
export async function makeDeck(deck: { slides: AnySlide[] } & Record<string, unknown>): Promise<Uint8Array | null> {
  try {
    const parsed = presentationSchema.safeParse(sanitizeDeck(deck));
    if (!parsed.success) {
      console.warn("[tools] PPT dilewati:", parsed.error.issues[0]?.path.join("."), parsed.error.issues[0]?.message);
      return null;
    }
    return await buildPresentation(parsed.data, {});
  } catch (err) {
    console.warn("[tools] PPT gagal dibuat", err);
    return null;
  }
}

/** Simpan file bila ada (PPT bisa null bila gagal dibuat). */
export async function storeMaybe(ctx: ToolCtx, name: string, kind: "pptx" | "xlsx", bytes: Uint8Array | null, label: string) {
  return bytes ? storeToolFile(ctx, name, kind, bytes, label) : null;
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
