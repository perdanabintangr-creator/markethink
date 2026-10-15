import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toolInfo } from "./catalog";
import { PRO_FORMS } from "./pro/forms";
import { resultToMarkdown } from "./to-markdown";

/** Versi terbaru (berhasil) dari rantai hasil Tools Pro: hasil asal + revisinya. */
export async function latestRunInChain(db: SupabaseClient, rootId: string) {
  const { data } = await db
    .from("tool_runs")
    .select("id, tool, title, output, created_at")
    .or(`id.eq.${rootId},revision_of.eq.${rootId}`)
    .eq("status", "ok")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/**
 * Instruksi tambahan untuk chat yang dibuka dari hasil Tools Pro ("Bahas di Chat"):
 * AI tahu versi hasil terbaru dan bisa meminta sistem memperbarui hasil (panel kanan) lewat blok [[PERBARUI_HASIL]].
 */
export async function toolRunChatPrompt(db: SupabaseClient, rootId: string) {
  const latest = await latestRunInChain(db, rootId);
  if (!latest) return "";
  const info = toolInfo(latest.tool as string);
  const revisable = Boolean(PRO_FORMS[latest.tool as string]);
  const parts = [
    `KONTEKS HASIL TOOLS PRO
Chat ini membahas hasil "${info?.name ?? latest.tool}" milik user. Hasilnya tampil di panel kanan layar user.`,
  ];
  if (latest.id !== rootId) {
    parts.push(`Hasil sudah diperbarui sejak pesan pertama. VERSI TERBARU yang sedang tampil di panel kanan:\n${resultToMarkdown(latest.output, 18_000)}`);
  }
  if (revisable) {
    parts.push(`MEMPERBARUI HASIL
Bila user meminta perubahan pada hasil (data keliru, maksud/tujuan berbeda, minta lebih tajam/"nendang", tambah/kurangi/ubah bagian tertentu),
jelaskan singkat apa yang akan kamu ubah dan kenapa (gaya konsultan, 2-6 poin), lalu AKHIRI jawaban dengan blok persis seperti ini:
[[PERBARUI_HASIL]]
Instruksi revisi yang lengkap, spesifik, dan bisa langsung dieksekusi — gabungkan semua koreksi user di percakapan ini, sebut bagian mana yang diubah dan arahnya.
[[/PERBARUI_HASIL]]
Sistem lalu otomatis membuat versi baru hasil (termasuk PPT/Excel) di panel kanan. Jangan tulis blok ini bila user hanya bertanya/diskusi,
dan jangan menulis ulang seluruh hasil di chat.`);
  }
  return parts.join("\n\n");
}
