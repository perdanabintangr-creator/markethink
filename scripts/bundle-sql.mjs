// Gabungkan semua migrasi jadi supabase/setup.sql (untuk dijalankan manual di Supabase SQL Editor).
import { readdirSync, readFileSync, writeFileSync } from "fs";

const dir = "supabase/migrations";
const parts = [
  "-- File gabungan semua migrasi Markethink. Jalankan SEKALI di Supabase → SQL Editor (project baru).",
  "-- Dibuat otomatis oleh: npm run db:bundle — jangan edit manual.",
];
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  parts.push("", `-- ===== ${f} =====`, readFileSync(`${dir}/${f}`, "utf8"));
}
writeFileSync("supabase/setup.sql", parts.join("\n"));
console.log("supabase/setup.sql diperbarui");
