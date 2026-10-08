import "server-only";
import Papa from "papaparse";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_EXTRACTED_CHARS = 60_000;

export const ALLOWED_MIME: Record<string, "pdf" | "docx" | "xlsx" | "pptx" | "text" | "csv" | "image"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/json": "text",
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
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  json: "application/json",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export const ALLOWED_EXTENSIONS = Object.keys(EXT_MIME);

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
    case "xlsx":
    case "pptx":
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
  } else if (kind === "xlsx") {
    text = await extractXlsx(bytes);
  } else if (kind === "pptx") {
    text = await extractPptx(bytes);
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

/** Excel: tiap sheet → ringkasan statistik + data (maks 300 baris per sheet). */
async function extractXlsx(bytes: Uint8Array): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
  const out: string[] = [];
  wb.eachSheet((ws) => {
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      if (rows.length >= 300) return;
      const values = (row.values as unknown[]).slice(1).map((v) => cellText(v));
      rows.push(values);
    });
    if (!rows.length) return;
    const csv = Papa.unparse(rows);
    out.push(`### Sheet: ${ws.name} (${ws.rowCount} baris)`, summarizeCsv(csv));
  });
  return out.join("\n\n") || "(workbook kosong)";
}

function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { result?: unknown; text?: string; richText?: { text: string }[]; hyperlink?: string };
    if (o.result !== undefined) return cellText(o.result);
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text) return o.text;
    if (o.hyperlink) return o.hyperlink;
    return "";
  }
  return String(v);
}

/** PowerPoint: teks tiap slide + catatan pembicara. */
async function extractPptx(bytes: Uint8Array): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const slideNo = (n: string) => Number(n.match(/(\d+)\.xml$/)?.[1] ?? 0);
  const texts = async (path: string) => {
    const xml = await zip.file(path)?.async("string");
    if (!xml) return "";
    return [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1])).join(" ").trim();
  };
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => slideNo(a) - slideNo(b));
  const out: string[] = [];
  for (const path of slides) {
    const n = slideNo(path);
    const body = await texts(path);
    const notes = await texts(`ppt/notesSlides/notesSlide${n}.xml`);
    out.push(`Slide ${n}: ${body || "(tanpa teks)"}${notes ? `\n  Catatan: ${notes}` : ""}`);
  }
  return out.join("\n") || "(presentasi tanpa teks)";
}

function decodeXml(s: string) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/** PDF hasil scan (tanpa teks) dikirim utuh ke model yang bisa membaca PDF. */
export function isScannedPdf(mime: string, text: string | null) {
  return mime === "application/pdf" && (text ?? "").replace(/\s+/g, "").length < 80;
}

/** Ambil file yang sudah diunggah ke Storage, validasi isinya, lalu ekstrak teks. */
export async function readStoredUpload(
  download: () => Promise<Blob | null>,
  name: string,
): Promise<{ bytes: Uint8Array; mime: string } | { error: "not_found" | "file_too_large" | "unsupported_type" }> {
  const blob = await download();
  if (!blob) return { error: "not_found" };
  if (blob.size > MAX_UPLOAD_BYTES) return { error: "file_too_large" };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mime = detectMime(name, blob.type, bytes);
  if (!mime) return { error: "unsupported_type" };
  return { bytes, mime };
}
