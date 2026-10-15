import { jsonrepair } from "jsonrepair";
import { z } from "zod";

/**
 * Hasil terstruktur yang tahan banting: AI menulis JSON biasa (bukan mode "strict grammar" yang gagal untuk skema besar),
 * lalu program memperbaiki JSON terpotong/berformat salah dan menyesuaikan tipe kecil (angka berupa teks, field kosong).
 */

/** Ringkas JSON Schema untuk prompt (buang metadata yang tidak perlu). */
export function schemaForPrompt(schema: z.ZodTypeAny) {
  const json = z.toJSONSchema(schema, { unrepresentable: "any" }) as Record<string, unknown>;
  delete json.$schema;
  return JSON.stringify(json);
}

/** Ambil objek JSON dari teks jawaban AI (abaikan ```json, teks pembuka/penutup) lalu perbaiki bila terpotong. */
export function extractJson(text: string): unknown {
  let s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = s.indexOf("{");
  if (start > 0) s = s.slice(start);
  const end = s.lastIndexOf("}");
  try {
    return JSON.parse(end > 0 ? s.slice(0, end + 1) : s);
  } catch {
    return JSON.parse(jsonrepair(s));
  }
}

type Path = (string | number)[];
const getAt = (obj: unknown, path: Path) => path.reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string | number, unknown>)[k]), obj);
function setAt(obj: unknown, path: Path, value: unknown) {
  if (!path.length) return;
  const parent = getAt(obj, path.slice(0, -1));
  if (parent && typeof parent === "object") (parent as Record<string | number, unknown>)[path[path.length - 1]] = value;
}
const toNumber = (v: unknown) => {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/**
 * Validasi dengan skema; bila ada kesalahan kecil, perbaiki otomatis lalu coba lagi:
 * angka berupa teks → angka, field teks/daftar yang hilang → "" / [], enum tak dikenal → pilihan pertama.
 */
export function coerceToSchema<T extends z.ZodTypeAny>(schema: T, data: unknown): { ok: true; data: z.infer<T> } | { ok: false; issues: string } {
  let value = data;
  for (let round = 0; round < 4; round++) {
    const res = schema.safeParse(value);
    if (res.success) return { ok: true, data: res.data };
    let changed = false;
    for (const issue of res.error.issues) {
      const path = issue.path as Path;
      const current = getAt(value, path);
      const i = issue as unknown as { code: string; expected?: string; values?: unknown[]; options?: unknown[] };
      if (i.code === "invalid_type") {
        if (i.expected === "number") {
          const n = toNumber(current);
          if (n !== null || current === undefined || current === null) {
            setAt(value, path, n ?? 0);
            changed = true;
          }
        } else if (i.expected === "string") {
          setAt(value, path, current == null ? "" : typeof current === "object" ? JSON.stringify(current) : String(current));
          changed = true;
        } else if (i.expected === "array") {
          setAt(value, path, current == null ? [] : [current]);
          changed = true;
        } else if (i.expected === "object" && current == null) {
          setAt(value, path, {});
          changed = true;
        } else if (i.expected === "boolean") {
          setAt(value, path, Boolean(current));
          changed = true;
        }
      } else if (i.code === "invalid_value" || i.code === "invalid_enum_value") {
        const options = (i.values ?? i.options ?? []) as unknown[];
        const match = options.find((o) => String(o).toLowerCase() === String(current ?? "").toLowerCase().trim());
        if (options.length) {
          setAt(value, path, match ?? options[0]);
          changed = true;
        }
      }
    }
    if (!changed) {
      return { ok: false, issues: res.error.issues.slice(0, 8).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") };
    }
    value = JSON.parse(JSON.stringify(value));
  }
  const last = schema.safeParse(value);
  return last.success ? { ok: true, data: last.data } : { ok: false, issues: last.error.issues.slice(0, 8).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") };
}
