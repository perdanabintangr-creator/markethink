import type { Lang } from "@/lib/i18n/dict";

/**
 * Bantuan mode ngobrol suara (tanpa API berbayar: pengenal suara & suara bawaan browser).
 * Fungsi di sini murni (tanpa DOM) supaya mudah dites.
 */

export const speechLang = (lang: Lang | null | undefined) => (lang === "en" ? "en-US" : "id-ID");

/** Ubah jawaban markdown jadi teks yang enak diucapkan, dipotong rapi di akhir kalimat. */
export function speakableText(markdown: string, lang: Lang | null | undefined, maxChars = 700) {
  let s = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*\|.*\|\s*$/gm, " ") // baris tabel
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // gambar
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // link → teksnya saja
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*(?:[-*+•]|\d+[.)])\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .replace(/[\p{Extended_Pictographic}️‍]/gu, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, ".\n")
    .replace(/\n/g, " ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
  if (s.length <= maxChars) return s;
  const cut = s.slice(0, maxChars);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  s = (end > maxChars * 0.4 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}...`).trim();
  return `${s} ${lang === "en" ? "The full details are on your screen." : "Detail lengkapnya ada di layar ya."}`;
}

/** Pecah teks per kalimat (± maks 200 huruf) supaya suara browser tidak terpotong di kalimat panjang. */
export function speechChunks(text: string, max = 200) {
  const out: string[] = [];
  for (const sentence of text.match(/[^.!?]+[.!?]*\s*/g) ?? [text]) {
    let rest = sentence.trim();
    while (rest.length > max) {
      const at = rest.lastIndexOf(" ", max);
      const i = at > max * 0.5 ? at : max;
      out.push(rest.slice(0, i).trim());
      rest = rest.slice(i).trim();
    }
    if (!rest) continue;
    if (out.length && out[out.length - 1].length + rest.length < max * 0.6) out[out.length - 1] += ` ${rest}`;
    else out.push(rest);
  }
  return out;
}

/** Kalimat jeda saat AI mulai mengerjakan, disesuaikan dengan permintaan user. */
export function fillerFor(request: string, lang: Lang | null | undefined, seed = Date.now()) {
  const q = request.toLowerCase();
  const en = lang === "en";
  if (/\b(ppt|presentasi|presentation|deck|slide)\b/.test(q))
    return en ? "Got it, I'll build the presentation now. Give me a moment." : "Oke, saya buatkan presentasinya dulu ya. Tunggu sebentar.";
  if (/\b(gambar|foto|poster|image|picture|carousel|visual|desain|design)\b/.test(q))
    return en ? "Sure, I'll create the visual first. Hang on." : "Siap, saya buatkan visualnya dulu ya. Sebentar.";
  if (/\b(riset|research|data|pasar|market|kompetitor|competitor|tren|trend)\b/.test(q))
    return en ? "Okay, let me research that first." : "Oke, saya riset dulu ya. Tunggu sebentar.";
  const pool = en
    ? ["Got it, let me think about that.", "Sure, give me a moment.", "Okay, I'm on it."]
    : ["Oke, saya pikirkan dulu ya.", "Siap, sebentar ya.", "Oke, saya kerjakan dulu ya."];
  return pool[Math.abs(seed) % pool.length];
}

/**
 * Gabungkan potongan hasil pengenal suara jadi satu kalimat utuh.
 * Chrome Android/tablet mengirim tiap potongan beserta kata-kata sebelumnya ("oke", "oke karena", "oke karena bisnis"...),
 * jadi potongan yang merupakan kelanjutan potongan sebelumnya menggantikannya, bukan disambung.
 */
export function mergeTranscripts(parts: string[]) {
  const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
  const out: string[] = [];
  for (const raw of parts) {
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const prev = out[out.length - 1];
    if (prev !== undefined) {
      const a = norm(prev);
      const b = norm(text);
      if (b.startsWith(a)) {
        out[out.length - 1] = text;
        continue;
      }
      if (a.startsWith(b)) continue;
    }
    out.push(text);
  }
  return out.join(" ");
}
