import "server-only";
import type { FilePart, ImagePart, TextPart } from "ai";
import type { z } from "zod";
import { untrusted } from "@/lib/ai/prompt";
import type { AddonId, ToolId } from "../catalog";
import { EXPERT, webResearch } from "../helpers";
import { aiObject, revisionBlock, makeDeck, makeWorkbook, withNotes, storeMaybe, storeToolFile, type SheetSpec, type ToolCtx, type ToolFile } from "../runtime";
import type { Runner, ToolResult } from "../tools";
import { briefFromFields, filesField, schemaFromFields, type ToolForm } from "./fields";
import { extractUrls, linksEvidence, readUserLinks } from "../links";

export { EXPERT } from "../helpers";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
/** Tanggal hari ini (WIB) untuk konteks kalender/promo. */
export function todayWIB(now = new Date()) {
  const d = new Date(now.getTime() + 7 * 3_600_000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export interface LoadedFiles {
  text: string;
  parts: (ImagePart | FilePart)[];
  hasImage: boolean;
  readable: boolean;
}

/** Baca file upload user (Excel/CSV/PDF/gambar). PDF hasil scan & gambar dikirim utuh agar dibaca visual oleh AI. */
export async function loadFiles(ctx: ToolCtx, ids: string[]): Promise<LoadedFiles> {
  const out: LoadedFiles = { text: "", parts: [], hasImage: false, readable: false };
  if (!ids.length) return out;
  const { data: rows } = await ctx.admin
    .from("attachments")
    .select("id, name, mime, storage_path, extracted_text")
    .eq("user_id", ctx.userId)
    .in("id", ids);
  if (!rows?.length) throw new Error("FILE_NOT_FOUND");
  for (const r of rows) {
    const text = String(r.extracted_text ?? "");
    const scannedPdf = r.mime === "application/pdf" && text.replace(/\s+/g, "").length < 80;
    if (scannedPdf || String(r.mime).startsWith("image/")) {
      const { data } = await ctx.admin.storage.from("uploads").download(r.storage_path as string);
      if (!data) continue;
      const bytes = new Uint8Array(await data.arrayBuffer());
      out.hasImage = true;
      out.readable = true;
      out.parts.push(
        scannedPdf
          ? { type: "file", data: bytes, mediaType: "application/pdf", filename: r.name as string }
          : { type: "image", image: bytes, mediaType: r.mime as string },
      );
      out.text += `\n[${scannedPdf ? "PDF (dibaca visual)" : "Gambar/screenshot"}: ${r.name}]`;
    } else if (text.trim()) {
      out.readable = true;
      out.text += `\n\n=== File: ${r.name} ===\n${text.slice(0, 45_000)}`;
    } else {
      out.text += `\n[File ${r.name} tidak bisa dibaca isinya]`;
    }
  }
  return out;
}

export interface ProFiles {
  /** Nama dasar file (tanpa ekstensi). */
  name: string;
  deck?: Parameters<typeof makeDeck>[0] | null;
  deckLabel?: string;
  sheets?: SheetSpec[];
  sheetLabel?: string;
}

/** Definisi satu tool per role: form, skema hasil, peran pakar, aturan tugas, dan cara membuat PPT/Excel. */
export interface ProDef<O extends z.ZodTypeAny> {
  tool: ToolId;
  addon: AddonId;
  form: ToolForm;
  output: O;
  /** Peran pakar yang dimainkan AI untuk tool ini (mis. "Kamu Head of Content…"). */
  role: string;
  /** Aturan & standar hasil untuk tugas ini. */
  rules: string | ((input: Record<string, string & string[] & number>) => string);
  /** Riset web sebelum menyusun hasil (opsional). */
  web?: (brief: string, input: Record<string, unknown>) => { system: string; maxUses?: number } | null;
  maxOutputTokens?: number;
  /** Cek isian sebelum memanggil AI; kembalikan pesan untuk user bila belum lengkap (kuota tidak terpotong). */
  validate?: (input: Record<string, unknown>) => string | null;
  /** Rapikan/hitung ulang hasil AI (angka total, urutan, dsb.) sebelum disimpan. */
  post?: (out: z.infer<O> & Record<string, unknown>, input: Record<string, unknown>) => void;
  title: (out: z.infer<O>, input: Record<string, unknown>) => string;
  files: (out: z.infer<O>, input: Record<string, unknown>) => ProFiles;
}

/** Ubah definisi tool menjadi runner standar (dipakai API /api/tools/[tool]). */
export function makeRunner<O extends z.ZodTypeAny>(def: ProDef<O>): Runner<z.ZodTypeAny> {
  const input = schemaFromFields(def.form.fields);
  const fileKey = filesField(def.form.fields);
  return {
    addon: def.addon,
    input,
    async run(ctx: ToolCtx, rawInput: unknown): Promise<ToolResult> {
      const raw = rawInput as Record<string, unknown>;
      const problem = def.validate?.(raw);
      if (problem) throw new Error(`USER:${problem}`);
      const brief = briefFromFields(def.form.fields, raw);
      const fileIds = fileKey ? ((raw[fileKey] as string[] | undefined) ?? []) : [];
      const loaded = await loadFiles(ctx, fileIds);
      const fileRequired = def.form.fields.some((f) => f.type === "files" && f.required);
      if (fileIds.length && !loaded.readable && fileRequired) throw new Error("FILE_UNREADABLE");

      let notes = "";
      let sources: { title: string; url: string }[] = [];
      let webNote = "";
      // Revisi tidak riset ulang: pakai sumber dari hasil sebelumnya.
      const web = ctx.revision ? null : def.web?.(brief, raw);
      if (ctx.revision) {
        const prev = ctx.revision.previous as { sources?: { title: string; url: string }[] } | null;
        sources = prev?.sources ?? [];
      }
      if (web) {
        const r = await webResearch(ctx, { system: `${EXPERT}\n\n${web.system}`, prompt: untrusted("brief", brief), maxUses: web.maxUses ?? 6 });
        notes = r.text;
        sources = r.sources;
        webNote = r.webNote;
      }

      // Link yang ditempel user (website, toko, landing page) dibuka & dipakai sebagai bukti nyata.
      const links = ctx.revision ? [] : await readUserLinks(extractUrls(raw));
      const linkText = linksEvidence(links);
      for (const l of links) if (l.ok && !sources.some((x) => x.url === l.url)) sources.push({ title: l.title || l.url, url: l.url });

      const rules = typeof def.rules === "function" ? def.rules(raw as never) : def.rules;
      const system = `${EXPERT}

PERAN KAMU UNTUK TUGAS INI
${def.role}

ATURAN & STANDAR HASIL
${rules}
${webNote ? `\n${webNote}` : ""}`;
      const text = [
        `Hari ini: ${todayWIB()} (WIB).`,
        untrusted("brief", brief),
        loaded.text && `Data dari file user:\n${untrusted("file", loaded.text)}`,
        linkText && `Isi halaman dari link yang diberikan user (bukti nyata; pakai sebagai fakta, sebut bila relevan):\n${untrusted("link", linkText.slice(0, 18_000))}`,
        notes && `Catatan riset web (pakai angka & fakta ini, sebut sumbernya bila relevan):\n${untrusted("riset", notes.slice(0, 30_000))}`,
        ctx.revision && revisionBlock(ctx.revision),
      ]
        .filter(Boolean)
        .join("\n\n");

      const content: (TextPart | ImagePart | FilePart)[] = [{ type: "text", text }, ...loaded.parts];
      const out = (await aiObject(ctx, {
        schema: def.output,
        system,
        vision: loaded.hasImage,
        maxOutputTokens: def.maxOutputTokens ?? 12000,
        revisionHandled: true,
        ...(loaded.parts.length ? { messages: [{ role: "user" as const, content }] } : { prompt: text }),
      })) as z.infer<O> & Record<string, unknown>;
      def.post?.(out, raw);
      if (sources.length) (out as Record<string, unknown>).sources = sources;

      const spec = def.files(out, raw);
      const [pptx, xlsx] = await Promise.all([
        spec.deck ? makeDeck(spec.deck) : Promise.resolve(null),
        spec.sheets?.length ? makeWorkbook(withNotes(ctx, spec.sheets)) : Promise.resolve(null),
      ]);
      const files = (
        await Promise.all([
          storeMaybe(ctx, `${spec.name}.pptx`, "pptx", pptx, spec.deckLabel ?? "PPT presentasi"),
          xlsx ? storeToolFile(ctx, `${spec.name}.xlsx`, "xlsx", xlsx, spec.sheetLabel ?? "Excel") : Promise.resolve(null),
        ])
      ).filter((f): f is ToolFile => Boolean(f));
      return { title: def.title(out, raw).slice(0, 200), output: out, files };
    },
  };
}

/** Isi minimal untuk layout PPT yang butuh jumlah item tertentu. */
export const atLeast = <T,>(list: T[], n: number, filler: T) => {
  const out = [...list];
  while (out.length < n) out.push(filler);
  return out;
};
