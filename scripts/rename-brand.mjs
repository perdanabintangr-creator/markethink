#!/usr/bin/env node
/**
 * Ganti nama brand di semua teks aplikasi: `node scripts/rename-brand.mjs <NamaLama> <NamaBaru>`.
 * Mengganti versi Kapital ("Markethink"), HURUF BESAR, dan huruf kecil di src/lib/brand.ts (& salinan back office).
 * Sengaja TIDAK menyentuh: migrasi database lama, nama teknis internal (env, cookie, salt OAuth, nama package),
 * serta catatan sejarah (DECISIONS.md, PROGRESS.md). Setelah itu ikuti BRANDING.md untuk langkah di luar kode.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [oldName, newName] = process.argv.slice(2);
if (!oldName || !newName) {
  console.error("Pakai: node scripts/rename-brand.mjs <NamaLama> <NamaBaru>");
  process.exit(1);
}
const ROOTS = ["src", "backoffice/src", "tests", "prompts", "README.md", ".env.example", "scripts/bundle-sql.mjs"];
const BRAND_FILES = ["src/lib/brand.ts", "backoffice/src/lib/brand.ts"];
const EXT = /\.(tsx?|mjs|md|json|example)$/;

function* walk(p) {
  const st = statSync(p, { throwIfNoEntry: false });
  if (!st) return;
  if (st.isDirectory()) for (const f of readdirSync(p)) yield* walk(join(p, f));
  else if (EXT.test(p) || p.endsWith(".env.example")) yield p;
}

let files = 0;
let hits = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    let out = src.split(oldName).join(newName).split(oldName.toUpperCase()).join(newName.toUpperCase());
    if (BRAND_FILES.includes(file)) out = out.split(oldName.toLowerCase()).join(newName.toLowerCase());
    if (out !== src) {
      writeFileSync(file, out);
      files += 1;
      hits += src.split(oldName).length - 1 + (src.split(oldName.toUpperCase()).length - 1);
    }
  }
}
console.log(`${hits} teks diganti di ${files} file. Lanjutkan: npm run check, migrasi data DB (deskripsi paket), lalu BRANDING.md.`);
