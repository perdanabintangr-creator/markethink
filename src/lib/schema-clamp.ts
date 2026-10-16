/**
 * Rapikan input tool dari AI agar lolos validasi skema: potong teks/daftar yang kepanjangan, isi enum yang salah
 * dengan nilai pertama, buang field opsional yang tidak memenuhi minimal. Dipakai saat AI (mis. otak Director yang
 * sangat detail) menulis isi PPT melebihi batas — daripada gagal lalu mengulang (lebih lama & lebih mahal).
 */
type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  enum?: unknown[];
  anyOf?: JsonSchema[];
};

const DROP = Symbol("drop");

function clamp(value: unknown, schema: JsonSchema): unknown | typeof DROP {
  if (schema.anyOf) {
    const s = schema.anyOf.find((x) => x.type !== "null") ?? schema.anyOf[0];
    return value === null ? value : clamp(value, s);
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== "null") : schema.type;
  if (schema.enum) return schema.enum.includes(value) ? value : schema.enum[0];
  switch (type) {
    case "string": {
      const s = typeof value === "string" ? value : value == null ? "" : String(value);
      return schema.maxLength ? s.slice(0, schema.maxLength) : s;
    }
    case "number":
    case "integer": {
      const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.,-]/g, "").replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    }
    case "array": {
      if (!Array.isArray(value)) return DROP;
      let arr = value.map((v) => (schema.items ? clamp(v, schema.items) : v)).filter((v) => v !== DROP);
      if (schema.maxItems !== undefined) arr = arr.slice(0, schema.maxItems);
      if (schema.minItems !== undefined && arr.length < schema.minItems) return DROP;
      return arr;
    }
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value)) return DROP;
      const out: Record<string, unknown> = {};
      for (const [key, sub] of Object.entries(schema.properties ?? {})) {
        const v = (value as Record<string, unknown>)[key];
        if (v === undefined) continue;
        const c = clamp(v, sub);
        if (c === DROP) {
          if (schema.required?.includes(key)) return DROP;
          continue;
        }
        out[key] = c;
      }
      return out;
    }
    default:
      return value;
  }
}

/** Kembalikan input yang sudah dirapikan, atau null bila tidak bisa diselamatkan. */
export function clampToSchema(value: unknown, schema: JsonSchema): unknown | null {
  const out = clamp(value, schema);
  return out === DROP ? null : out;
}
