import { slidesText, type Slide } from "./slides";
import { forbiddenHits } from "./voice";

/**
 * Pemeriksa caption & slide Autopilot Konten (port lint.py dari skill konten @marqthink.ai, adaptasi Instagram Agent
 * Skill — Jake Schincariol, MIT). FAIL wajib diperbaiki sebelum tayang; WARN ditampilkan ke pelanggan sebagai saran.
 */

export const SLOP = [
  "di era digital", "di era modern", "era serba cepat", "dunia yang serba", "tidak dapat dipungkiri", "tak dapat dipungkiri",
  "mari kita", "simak sampai habis", "simak selengkapnya", "jangan lupa like", "like dan share", "tag teman", "tag temanmu",
  "game changer", "game-changer", "revolusioner", "merevolusi", "solusi terbaik", "solusi tepat", "rahasia sukses",
  "kunci sukses", "wajib tahu", "maksimalkan potensi", "potensi penuh", "secara signifikan", "tak terbatas", "tanpa batas",
  "luar biasa", "sangat penting", "perlu diingat", "pada akhirnya", "dengan kata lain", "tidak hanya itu", "lebih dari sekadar",
  "dalam hitungan detik", "100%", "dijamin", "pasti viral", "auto viral", "seamless", "leverage", "delve", "unlock",
  "elevate", "next level", "stop scrolling", "berhenti scroll", "follow for more",
];
const BAD_TAGS = new Set(["#fyp", "#viral", "#explore", "#explorepage", "#foryou", "#foryoupage", "#trending"]);
const CTA = [/\bkomen/, /\bkomentar/, /\bsimpan\b/, /\bsave\b/, /\bfollow\b/, /\bikuti\b/, /notifikasi/, /\bshare\b/, /\bbagikan\b/, /\bkirim ke\b/, /\bdaftar\b/, /\bdm\b/, /\bpesan\b/, /\bcek\b/, /\bklik\b/];
const INVIS = /[​-‏⁠-⁤­﻿‪-‮]|\uDB40[\uDC00-\uDC7F]/g;
const EMOJI = /\p{Extended_Pictographic}/gu;

export interface LintResult {
  fails: string[];
  warns: string[];
}

/** Bersihkan tanda khas tulisan AI: karakter tak terlihat, em dash, kutip miring. */
export function fixCaption(s: string) {
  return s
    .replace(INVIS, "")
    .replace(/[  ]/g, " ")
    .replace(/\s*—\s*/g, ", ")
    .replace(/–/g, "-")
    .replace(/…/g, "...")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([.!?])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Batasi hashtag ke 5 (Instagram membatasi 5); hashtag merek diprioritaskan. */
export function capHashtags(cap: string, brandTag?: string) {
  const tags = cap.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  if (tags.length <= 5) return cap;
  const keep = new Set<string>();
  if (brandTag && tags.some((t) => t.toLowerCase() === brandTag.toLowerCase())) keep.add(tags.find((t) => t.toLowerCase() === brandTag.toLowerCase())!);
  for (const t of tags) if (keep.size < 5 && !BAD_TAGS.has(t.toLowerCase())) keep.add(t);
  let seen = 0;
  return cap.replace(/#[\p{L}\p{N}_]+/gu, (t) => (keep.has(t) && seen++ < 5 ? t : "")).replace(/[ \t]{2,}/g, " ").trim();
}

/** Hashtag merek: "#" + nama brand tanpa spasi/simbol (mis. "Kopi Senja" → #KopiSenja). */
export function brandHashtag(name: string) {
  const t = name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return t ? `#${t}` : "";
}

export function lintCaption(cap: string, o: { brandName?: string; keywords?: string[]; forbidden?: string | null } = {}): LintResult {
  const fails: string[] = [];
  const warns: string[] = [];
  const low = cap.toLowerCase();
  if (INVIS.test(cap)) fails.push("Ada karakter tak terlihat.");
  INVIS.lastIndex = 0;
  if (/[—–]/.test(cap)) fails.push("Ada tanda pisah panjang (—), ciri tulisan AI.");
  if (cap.length > 2200) fails.push(`Caption ${cap.length} karakter, melebihi batas Instagram 2.200.`);
  else if (cap.length > 900) warns.push(`Caption ${cap.length} karakter; 300–700 biasanya cukup.`);
  const first = cap.trim().split("\n")[0] ?? "";
  if (first.startsWith("#") || /^\p{Extended_Pictographic}/u.test(first)) fails.push("Baris pertama dibuka hashtag/emoji; buka dengan hook.");
  if (/^(halo|hai|hi|selamat (pagi|siang|sore|malam))\b/i.test(first)) fails.push("Baris pertama dibuka sapaan; langsung ke hook.");
  if (/https?:\/\/|www\./i.test(cap)) fails.push("Ada link di caption (tidak bisa diklik di Instagram; taruh di bio).");
  const tags = cap.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  if (tags.length > 5) fails.push(`${tags.length} hashtag; Instagram membatasi 5.`);
  else if (tags.length < 3) warns.push(`Baru ${tags.length} hashtag; 3–5 hashtag spesifik paling efektif.`);
  for (const t of tags) if (BAD_TAGS.has(t.toLowerCase())) fails.push(`Hashtag tidak berguna: ${t}.`);
  const bt = o.brandName ? brandHashtag(o.brandName) : "";
  if (bt && !tags.some((t) => t.toLowerCase() === bt.toLowerCase())) warns.push(`Belum ada hashtag merek ${bt}.`);
  if (o.keywords?.length && !o.keywords.some((k) => cap.slice(0, 125).toLowerCase().includes(k.toLowerCase()))) {
    warns.push("125 karakter pertama belum memuat kata kunci utama brand.");
  }
  for (const w of forbiddenHits(cap, o.forbidden)) fails.push(`Memakai kata yang dilarang brand: "${w}".`);
  if (/\bAnda\b/.test(cap)) warns.push("Pakai 'Anda'; sapaan 'kamu' terasa lebih dekat di Instagram.");
  for (const w of SLOP) if (low.includes(w)) warns.push(`Frasa klise: "${w}".`);
  const nCta = CTA.filter((re) => re.test(low)).length;
  if (nCta === 0) warns.push("Belum ada ajakan (komen, simpan, follow, DM).");
  else if (nCta > 3) warns.push("Terlalu banyak ajakan; pilih satu ajakan utama.");
  const em = (cap.match(EMOJI) ?? []).length;
  if (cap.length && (em / cap.length) * 100 > 4) warns.push(`Emoji terlalu banyak (${em}).`);
  return { fails, warns };
}

export function lintSlides(slides: Slide[], kind: "carousel" | "image" | "reel", forbidden?: string | null): LintResult {
  const fails: string[] = [];
  const warns: string[] = [];
  if (kind === "reel") return { fails, warns };
  if (!slides.length) fails.push("Belum ada slide.");
  if (kind === "carousel" && slides.length > 1 && (slides.length < 4 || slides.length > 10)) warns.push(`Carousel ${slides.length} slide; ideal 5–8.`);
  slides.forEach((s, i) => {
    const head = [s.title, s.accent].filter(Boolean).join(" ").replace(/\\n|\n/g, " ");
    const nw = head.split(/\s+/).filter(Boolean).length;
    if (nw > (i === 0 ? 10 : 9)) warns.push(`Slide ${i + 1}: judul ${nw} kata, terlalu panjang untuk dibaca sekilas.`);
    for (const k of ["sub", "body"] as const) {
      const v = s[k];
      if (v && v.split(/\s+/).length > 25) fails.push(`Slide ${i + 1}: teks ${v.split(/\s+/).length} kata (maks 25).`);
    }
  });
  if (/[—]/.test(slidesText(slides))) fails.push("Ada tanda pisah panjang (—) di slide.");
  for (const w of forbiddenHits(slidesText(slides), forbidden)) fails.push(`Slide memakai kata yang dilarang brand: "${w}".`);
  return { fails, warns };
}
