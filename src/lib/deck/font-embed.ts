import "server-only";
import { inflateSync } from "node:zlib";
import JSZip from "jszip";
import { loadDeckFont } from "./engine";

/**
 * Tanam font deck Signature ke dalam file .pptx (seperti "Embed fonts" di PowerPoint), agar PowerPoint / WPS / Keynote
 * menampilkan font yang sama dengan pratinjau & PDF walau font tidak terpasang di komputer pemakai.
 * Format: ppt/fonts/fontN.fntdata = Embedded OpenType (EOT, tanpa kompresi) berisi TrueType hasil dekompresi WOFF.
 */

/** WOFF (zlib per tabel) → TrueType/OpenType biasa. */
export function woffToSfnt(woff: Uint8Array): Buffer {
  const b = Buffer.from(woff);
  if (b.toString("latin1", 0, 4) !== "wOFF") throw new Error("bukan WOFF");
  const flavor = b.readUInt32BE(4);
  const numTables = b.readUInt16BE(12);
  const tables = Array.from({ length: numTables }, (_, i) => {
    const o = 44 + i * 20;
    const tag = b.toString("latin1", o, o + 4);
    const offset = b.readUInt32BE(o + 4);
    const compLength = b.readUInt32BE(o + 8);
    const origLength = b.readUInt32BE(o + 12);
    const checksum = b.readUInt32BE(o + 16);
    const raw = b.subarray(offset, offset + compLength);
    const data = compLength < origLength ? inflateSync(raw) : Buffer.from(raw);
    return { tag, checksum, data };
  });
  const pow = 2 ** Math.floor(Math.log2(numTables));
  const header = Buffer.alloc(12 + numTables * 16);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(numTables, 4);
  header.writeUInt16BE(pow * 16, 6);
  header.writeUInt16BE(Math.log2(pow), 8);
  header.writeUInt16BE(numTables * 16 - pow * 16, 10);
  let offset = header.length;
  const chunks: Buffer[] = [header];
  tables
    .sort((a, c) => (a.tag < c.tag ? -1 : 1))
    .forEach((t, i) => {
      const r = 12 + i * 16;
      header.write(t.tag, r, "latin1");
      header.writeUInt32BE(t.checksum, r + 4);
      header.writeUInt32BE(offset, r + 8);
      header.writeUInt32BE(t.data.length, r + 12);
      const padded = Buffer.alloc((t.data.length + 3) & ~3);
      t.data.copy(padded);
      chunks.push(padded);
      offset += padded.length;
    });
  return Buffer.concat(chunks);
}

interface FontMeta {
  family: string;
  style: string;
  version: string;
  full: string;
  weight: number;
  italic: boolean;
  fsType: number;
  panose: number[];
  unicodeRange: number[];
  codePageRange: number[];
  checkSumAdjustment: number;
}

/** Cari tabel di sfnt. */
function table(sfnt: Buffer, tag: string) {
  const num = sfnt.readUInt16BE(4);
  for (let i = 0; i < num; i++) {
    const r = 12 + i * 16;
    if (sfnt.toString("latin1", r, r + 4) === tag) return sfnt.subarray(sfnt.readUInt32BE(r + 8), sfnt.readUInt32BE(r + 8) + sfnt.readUInt32BE(r + 12));
  }
  return null;
}

const metaCache = new Map<string, { meta: FontMeta; sfnt: Buffer }>();

function metaOf(file: string): FontMeta {
  return sfntOf(file).meta;
}

function sfntOf(file: string) {
  const hit = metaCache.get(file);
  if (hit) return hit;
  const sfnt = woffToSfnt(loadDeckFont(file).bytes);
  const os2 = table(sfnt, "OS/2");
  const head = table(sfnt, "head");
  if (!os2 || !head) throw new Error(`font ${file} tanpa tabel OS/2/head`);
  const fk = loadDeckFont(file).fk as unknown as { name: { records: Record<string, { en?: string } | undefined> } };
  const n = (k: string) => fk.name.records[k]?.en ?? "";
  const meta: FontMeta = {
    family: n("fontFamily"),
    style: n("fontSubfamily") || "Regular",
    version: n("version"),
    full: n("fullName") || `${n("fontFamily")} ${n("fontSubfamily")}`,
    weight: os2.readUInt16BE(4),
    italic: Boolean(os2.readUInt16BE(62) & 1),
    fsType: 0, // Google Fonts (OFL) = installable embedding
    panose: [...os2.subarray(32, 42)],
    unicodeRange: [0, 1, 2, 3].map((k) => os2.readUInt32BE(42 + k * 4)),
    codePageRange: os2.readUInt16BE(0) >= 1 && os2.length >= 86 ? [os2.readUInt32BE(78), os2.readUInt32BE(82)] : [1, 0],
    checkSumAdjustment: head.readUInt32BE(8),
  };
  const out = { meta, sfnt };
  metaCache.set(file, out);
  return out;
}

/** Nama keluarga & gaya font seperti tertulis di dalam file font (dipakai sebagai nama font di PPT agar cocok saat ditanam). */
export function pptFaceOf(file: string) {
  const m = metaOf(file);
  return { face: m.family, bold: /bold/i.test(m.style) && !/semi|extra|ultra|light/i.test(m.style) };
}

/** Bungkus TrueType menjadi EOT versi 0x00020001 tanpa kompresi/XOR. */
export function sfntToEot(sfnt: Buffer, m: FontMeta): Buffer {
  const str = (s: string) => Buffer.from(s, "utf16le");
  const names = [m.family, m.style, m.version, m.full].map(str);
  const parts: Buffer[] = [];
  const u16 = (v: number) => {
    const x = Buffer.alloc(2);
    x.writeUInt16LE(v);
    parts.push(x);
  };
  const u32 = (v: number) => {
    const x = Buffer.alloc(4);
    x.writeUInt32LE(v >>> 0);
    parts.push(x);
  };
  u32(0); // EOTSize (diisi di akhir)
  u32(sfnt.length);
  u32(0x00020001);
  u32(0); // Flags: tanpa subset/kompresi/XOR
  parts.push(Buffer.from(m.panose.slice(0, 10).concat(new Array(10).fill(0)).slice(0, 10)));
  parts.push(Buffer.from([1, m.italic ? 1 : 0])); // Charset DEFAULT, Italic
  u32(m.weight);
  u16(m.fsType);
  u16(0x504c);
  m.unicodeRange.forEach(u32);
  m.codePageRange.forEach(u32);
  u32(m.checkSumAdjustment);
  for (let i = 0; i < 4; i++) u32(0);
  u16(0); // Padding1
  names.forEach((nm, i) => {
    if (i) u16(0); // Padding2..4
    u16(nm.length);
    parts.push(nm);
  });
  u16(0); // Padding5
  u16(0); // RootStringSize — header versi 0x00020001 berakhir di sini
  parts.push(sfnt);
  const out = Buffer.concat(parts);
  out.writeUInt32LE(out.length, 0);
  return out;
}

/** Tambahkan font ke .pptx: ppt/fonts/*.fntdata + relasi + daftar embeddedFontLst di presentation.xml. */
export async function embedFontsInPptx(pptx: Uint8Array, files: string[]): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(pptx);
  const relPath = "ppt/_rels/presentation.xml.rels";
  let rels = await zip.file(relPath)!.async("string");
  let pres = await zip.file("ppt/presentation.xml")!.async("string");
  let types = await zip.file("[Content_Types].xml")!.async("string");
  const byFamily = new Map<string, { regular?: string; bold?: string }>();
  let n = 0;
  for (const file of [...new Set(files)]) {
    const m = metaOf(file);
    const { face, bold } = pptFaceOf(file);
    const slot = byFamily.get(face) ?? {};
    const key = bold ? "bold" : "regular";
    if (slot[key]) continue;
    n++;
    const rId = `rIdMtFont${n}`;
    zip.file(`ppt/fonts/font${n}.fntdata`, sfntToEot(sfntOf(file).sfnt, m));
    rels = rels.replace(
      "</Relationships>",
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font${n}.fntdata"/></Relationships>`,
    );
    slot[key] = rId;
    byFamily.set(face, slot);
  }
  if (!n) return pptx;
  if (!types.includes('Extension="fntdata"'))
    types = types.replace("<Default ", '<Default Extension="fntdata" ContentType="application/x-fontdata"/><Default ');
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const list = [...byFamily]
    .map(
      ([face, s]) =>
        `<p:embeddedFont><p:font typeface="${esc(face)}" pitchFamily="2" charset="0"/>${s.regular ? `<p:regular r:id="${s.regular}"/>` : ""}${s.bold ? `<p:bold r:id="${s.bold}"/>` : ""}</p:embeddedFont>`,
    )
    .join("");
  // Urutan skema: ... sldSz, notesSz, smartTags?, embeddedFontLst, ...
  pres = pres.replace(/(<p:notesSz[^>]*\/>)/, `$1<p:embeddedFontLst>${list}</p:embeddedFontLst>`);
  pres = pres.replace(/<p:presentation\b/, (tag) => `${tag} embedTrueTypeFonts="1"`);
  zip.file(relPath, rels);
  zip.file("ppt/presentation.xml", pres);
  zip.file("[Content_Types].xml", types);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
