import "server-only";
import Papa from "papaparse";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_EXTRACTED_CHARS = 60_000;

export const ALLOWED_MIME: Record<string, "pdf" | "docx" | "text" | "csv" | "image"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "text",
  "text/markdown": "text",
  "text/csv": "csv",
  "application/vnd.ms-excel": "csv",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
};

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Tentukan mime dari ekstensi + magic bytes, bukan hanya header dari browser. */
export function detectMime(name: string, declared: string, bytes: Uint8Array): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const byExt = EXT_MIME[ext];
  const mime = byExt ?? declared;
  if (!ALLOWED_MIME[mime]) return null;
  const head = Array.from(bytes.slice(0, 8));
  const starts = (sig: number[]) => sig.every((b, i) => head[i] === b);
  switch (ALLOWED_MIME[mime]) {
    case "pdf":
      return starts([0x25, 0x50, 0x44, 0x46]) ? mime : null;
    case "docx":
      return starts([0x50, 0x4b, 0x03, 0x04]) ? mime : null;
    case "image":
      if (starts([0x89, 0x50, 0x4e, 0x47])) return "image/png";
      if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
      if (starts([0x47, 0x49, 0x46, 0x38])) return "image/gif";
      if (starts([0x52, 0x49, 0x46, 0x46])) return "image/webp";
      return null;
    default:
      // teks: tolak jika ada null byte (biner)
      return bytes.slice(0, 4096).includes(0) ? null : mime;
  }
}

export function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").slice(0, 120) || "file";
}

export async function extractText(mime: string, bytes: Uint8Array): Promise<string> {
  const kind = ALLOWED_MIME[mime];
  let text = "";
  if (kind === "pdf") {
    const { extractText: pdfExtract, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const res = await pdfExtract(pdf, { mergePages: true });
    text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
  } else if (kind === "docx") {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    text = res.value;
  } else if (kind === "csv") {
    text = summarizeCsv(new TextDecoder().decode(bytes));
  } else if (kind === "text") {
    text = new TextDecoder().decode(bytes);
  }
  return text.slice(0, MAX_EXTRACTED_CHARS);
}

/** Ringkas CSV: header, jumlah baris, statistik kolom numerik, dan sampel baris. */
export function summarizeCsv(raw: string): string {
  const parsed = Papa.parse<Record<string, string>>(raw.trim(), { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  const cols = parsed.meta.fields ?? [];
  const lines = [`CSV: ${rows.length} baris, ${cols.length} kolom`, `Kolom: ${cols.join(", ")}`];
  for (const col of cols) {
    const values = rows.map((r) => String(r[col] ?? "").trim()).filter(Boolean);
    const filled = values.length;
    const nums = values.filter((v) => /^[^a-zA-Z]*\d[^a-zA-Z]*$/.test(v)).map((v) => Number(v.replace(/[^\d.-]/g, ""))).filter((n) => Number.isFinite(n));
    if (nums.length >= Math.max(1, filled * 0.8) && filled > 0) {
      const sum = nums.reduce((a, b) => a + b, 0);
      lines.push(`- ${col}: numerik, min ${Math.min(...nums)}, max ${Math.max(...nums)}, rata-rata ${(sum / nums.length).toFixed(2)}, total ${sum}`);
    } else {
      const uniq = new Set(rows.map((r) => r[col])).size;
      lines.push(`- ${col}: teks, ${uniq} nilai unik`);
    }
  }
  const sample = Papa.unparse(rows.slice(0, 200));
  lines.push("", "Data (maks 200 baris pertama):", sample);
  return lines.join("\n");
}
