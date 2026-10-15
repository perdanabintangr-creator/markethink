import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toolInfo } from "./catalog";
import { isAiTool } from "./tools";
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
  const revisable = isAiTool(latest.tool as string);
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
dan jangan menulis ulang seluruh hasil di chat.
Anggap juga sebagai permintaan perubahan bila user menyetujui tawaranmu sebelumnya untuk memperbarui hasil (mis. "ya", "boleh", "update", "gas", "masukkan ke hasil").
Bila diskusi menghasilkan ide/arah baru yang mengubah isi hasil tetapi user belum meminta perubahan, JANGAN tulis blok; cukup tutup dengan satu kalimat tawaran:
"Mau saya masukkan ke hasil di panel kanan? Balas *ya*, atau klik **Perbarui hasil** di bawah jawaban ini."`);
  }
  return parts.join("\n\n");
}

const dateWIB = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

/**
 * Untuk chat biasa: daftar hasil Tools Pro milik user (versi terbaru per hasil), supaya AI paham
 * bila user menyinggung "yang sudah saya buat di Tools Pro" lalu membaca isinya lewat tool `read_tool_result`.
 */
export async function toolRunsIndexPrompt(db: SupabaseClient, userId: string) {
  const { data } = await db
    .from("tool_runs")
    .select("id, tool, title, created_at, revision_of")
    .eq("user_id", userId)
    .eq("status", "ok")
    .order("created_at", { ascending: false })
    .limit(80);
  if (!data?.length) return "";
  const seen = new Map<string, { id: string; tool: string; title: string | null; created_at: string; versions: number }>();
  for (const r of data) {
    const root = (r.revision_of as string | null) ?? (r.id as string);
    const cur = seen.get(root);
    if (cur) cur.versions++;
    else seen.set(root, { id: r.id as string, tool: r.tool as string, title: r.title as string | null, created_at: r.created_at as string, versions: 1 });
  }
  const lines = [...seen.values()].slice(0, 25).map((r) => {
    const name = toolInfo(r.tool)?.name ?? r.tool;
    return `- id=${r.id} · "${(r.title ?? name).replace(/"/g, "'")}" · ${name} · ${dateWIB(r.created_at)}${r.versions > 1 ? ` · versi ${r.versions}` : ""}`;
  });
  return `HASIL TOOLS PRO MILIK USER
User juga memakai Markethink Tools Pro (mode terpisah di sidebar). Hasil terbarunya (terbaru di atas):
${lines.join("\n")}
Bila user menyinggung hasil yang dibuat di Tools Pro (mis. "yang sudah saya buat di Tools Pro", "persona tadi", "kalender kontenku", menyebut brand/judulnya),
panggil tool \`read_tool_result\` dengan id yang paling cocok SEBELUM menjawab, lalu jawab berdasarkan isinya (sebut judulnya). Jangan mengarang isi hasil.
Bila ada beberapa yang mirip, pilih yang terbaru atau tanyakan singkat. Bila user ingin hasilnya diubah/diperbarui, bantu di sini lalu sarankan
membuka hasil itu dan klik "Bahas di Chat" agar versinya bisa diperbarui otomatis (termasuk PPT/Excel).`;
}

/** Isi hasil Tools Pro (versi terbaru) milik user — dipanggil AI di chat biasa. */
export async function readToolResult(db: SupabaseClient, userId: string, runId: string) {
  const { data: run } = await db.from("tool_runs").select("id, revision_of").eq("id", runId).eq("user_id", userId).maybeSingle();
  if (!run) return { ok: false as const, error: "Hasil tidak ditemukan. Cek id-nya di daftar hasil Tools Pro." };
  const latest = await latestRunInChain(db, (run.revision_of as string | null) ?? (run.id as string));
  if (!latest) return { ok: false as const, error: "Hasil belum selesai atau gagal dibuat." };
  const name = toolInfo(latest.tool as string)?.name ?? (latest.tool as string);
  return {
    ok: true as const,
    title: (latest.title as string | null) ?? name,
    tool: name,
    date: dateWIB(latest.created_at as string),
    link: `/tools/${latest.tool}/${latest.id}`,
    content: resultToMarkdown(latest.output, 20_000),
  };
}
