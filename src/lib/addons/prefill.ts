import { z } from "zod";
import { PRO_FORMS } from "./pro/forms";

/**
 * "Ceritakan singkat, biar AI yang isi form": daftar field yang boleh diisi otomatis untuk sebuah tool,
 * dan pembersih jawaban AI supaya hanya nilai yang valid yang masuk ke form. Aman dipakai di server & client.
 */
export interface PrefillField {
  name: string;
  label: string;
  type: "text" | "select" | "chips" | "number";
  options?: string[];
  min?: number;
  max?: number;
}

/** Field form tool (Tools Pro dari PRO_FORMS; tool lama dari skema input-nya). Upload file tidak ikut. */
export function prefillFields(tool: string, inputSchema?: z.ZodTypeAny): PrefillField[] {
  const pro = PRO_FORMS[tool];
  if (pro) {
    return pro.fields.flatMap((f): PrefillField[] => {
      const label = f.label.replace(/\s*\*$/, "");
      switch (f.type) {
        case "text":
        case "textarea":
          return [{ name: f.name, label, type: "text", max: f.max }];
        case "select":
          return [{ name: f.name, label, type: "select", options: f.options.map((o) => `${o.value} (${o.label})`) }];
        case "chips":
          return [{ name: f.name, label, type: "chips", options: f.options.map((o) => `${o.value} (${o.label})`) }];
        case "number":
          return [{ name: f.name, label, type: "number", min: f.min, max: f.max }];
        default:
          return [];
      }
    });
  }
  if (!inputSchema) return [];
  const json = z.toJSONSchema(inputSchema, { unrepresentable: "any", io: "input" }) as {
    properties?: Record<string, { type?: string; enum?: string[]; maxLength?: number; minimum?: number; maximum?: number; items?: { enum?: string[] } }>;
  };
  return Object.entries(json.properties ?? {}).flatMap(([name, p]): PrefillField[] => {
    if (name === "attachment_ids") return [];
    if (p.enum) return [{ name, label: name, type: "select", options: p.enum }];
    if (p.type === "array" && p.items?.enum) return [{ name, label: name, type: "chips", options: p.items.enum }];
    if (p.type === "number" || p.type === "integer") return [{ name, label: name, type: "number", min: p.minimum, max: p.maximum }];
    if (p.type === "string") return [{ name, label: name, type: "text", max: p.maxLength }];
    return [];
  });
}

/** Nilai pilihan tanpa label: "sales (Penjualan)" → "sales". */
const optValue = (o: string) => o.replace(/\s*\(.*\)$/, "");

/** Ambil hanya nilai yang valid untuk tiap field; sisanya dibuang (form tetap memakai isian user/bawaan). */
export function sanitizePrefill(fields: PrefillField[], raw: unknown): Record<string, string | number | string[]> {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, string | number | string[]> = {};
  for (const f of fields) {
    const v = src[f.name];
    if (v === undefined || v === null || v === "") continue;
    if (f.type === "text") {
      const s = String(v).trim();
      if (s) out[f.name] = f.max ? s.slice(0, f.max) : s;
    } else if (f.type === "select") {
      const allowed = (f.options ?? []).map(optValue);
      const s = optValue(String(v).trim());
      if (allowed.includes(s)) out[f.name] = s;
    } else if (f.type === "chips") {
      const allowed = (f.options ?? []).map(optValue);
      const list = (Array.isArray(v) ? v : String(v).split(",")).map((x) => optValue(String(x).trim())).filter((x) => allowed.includes(x));
      if (list.length) out[f.name] = [...new Set(list)];
    } else {
      const n = Number(v);
      if (Number.isFinite(n)) out[f.name] = Math.round(Math.min(f.max ?? n, Math.max(f.min ?? n, n)));
    }
  }
  return out;
}
