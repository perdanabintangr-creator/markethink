import { z } from "zod";

/**
 * Form deklaratif untuk Tools Pro per role: satu definisi field → form di layar + validasi input di server + ringkasan brief untuk AI.
 * Aman dipakai di server maupun client.
 */

interface Base {
  name: string;
  label: string;
  hint?: string;
  /** Lebar setengah (2 kolom) di layar lebar. */
  half?: boolean;
}

export type Field =
  | (Base & { type: "text"; required?: boolean; max: number; placeholder?: string })
  | (Base & { type: "textarea"; required?: boolean; min?: number; max: number; rows?: number; placeholder?: string })
  /** `loose`: terima nilai di luar daftar (mis. pilihan bulan yang bergeser saat ganti bulan). */
  | (Base & { type: "select"; options: { value: string; label: string }[]; default: string; loose?: boolean })
  | (Base & { type: "chips"; options: { value: string; label: string }[]; defaults: string[]; min?: number })
  | (Base & { type: "number"; min: number; max: number; default: number; suffix?: string })
  /** Upload file (Excel/CSV/PDF/gambar) → `attachment_ids`. */
  | (Base & { type: "files"; required?: boolean; accept?: string; max?: number });

export interface ToolForm {
  fields: Field[];
  /** Langkah yang ditampilkan saat proses berjalan. */
  steps: string[];
}

const opts = (pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));
export { opts };

/** Bangun skema zod input dari daftar field (dipakai server untuk validasi). */
export function schemaFromFields(fields: Field[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    switch (f.type) {
      case "text":
      case "textarea": {
        const min = f.type === "textarea" ? (f.min ?? 3) : 2;
        shape[f.name] = f.required
          ? z.string().trim().min(min, `Isi "${f.label}" dulu`).max(f.max)
          : z.string().trim().max(f.max).optional().default("");
        break;
      }
      case "select":
        shape[f.name] = f.loose
          ? z.string().trim().min(1).max(30).default(f.default)
          : z.enum(f.options.map((o) => o.value) as [string, ...string[]]).default(f.default);
        break;
      case "chips":
        shape[f.name] = z
          .array(z.enum(f.options.map((o) => o.value) as [string, ...string[]]))
          .min(f.min ?? 1, `Pilih minimal ${f.min ?? 1} "${f.label}"`);
        break;
      case "number":
        shape[f.name] = z.coerce.number().int().min(f.min).max(f.max).default(f.default);
        break;
      case "files":
        shape[f.name] = f.required
          ? z.array(z.string().uuid()).min(1, "Upload file dulu").max(f.max ?? 5)
          : z.array(z.string().uuid()).max(f.max ?? 5).optional().default([]);
        break;
    }
  }
  return z.object(shape);
}

/** Ringkas input jadi brief yang mudah dibaca AI (memakai label field, bukan nama teknis). */
export function briefFromFields(fields: Field[], input: Record<string, unknown>) {
  const lines: string[] = [];
  for (const f of fields) {
    const v = input[f.name];
    if (f.type === "files") continue;
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
    const label = (val: string) => ("options" in f ? (f.options.find((o) => o.value === val)?.label ?? val) : val);
    const text = Array.isArray(v) ? v.map((x) => label(String(x))).join(", ") : label(String(v));
    lines.push(`${f.label.replace(/\s*\*$/, "")}: ${text}${f.type === "number" && f.suffix ? ` ${f.suffix}` : ""}`);
  }
  return lines.join("\n");
}

/** Nama field upload pada sebuah form (bila ada). */
export const filesField = (fields: Field[]) => fields.find((f) => f.type === "files")?.name ?? null;
