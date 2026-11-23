/**
 * Template sosmed UMKM Indonesia (ACC founder 23 Nov 2026): logo kiri atas, judul tebal dengan kotak highlight, visual
 * subjek di tengah, kartu catatan untuk tips/daftar, VS, label harga, keterangan bergaris (elegan), dan bar kontak di
 * bawah (WA, IG, website, tombol ajakan). Pola diambil dari referensi 5 industri; warna selalu dari brand.
 * Dipanggil dari render.ts (helper teks & font diteruskan supaya satu sumber).
 */
import type { Slide, SlideBrand } from "./slides";
import { sosmedBg, type SosmedTemplate, type StyleDna } from "./style";

export const W = 1080;
export const H = 1350;

/** Kontak di bar bawah (dari Brand Kit). */
export interface SosmedContact {
  wa?: string | null;
  ig?: string | null;
  web?: string | null;
  /** Teks tombol ajakan, mis. "Pesan Sekarang". */
  cta?: string | null;
}

export interface TextKit {
  /** Lebar teks satu baris. */
  width(font: string, s: string, size: number): number;
  /** Bungkus teks ke beberapa baris. */
  wrap(font: string, s: string, size: number, maxW: number): string[];
  /** Satu baris → path SVG; `top` = sisi atas kotak baris setinggi size*lh. */
  line(font: string, s: string, x: number, top: number, size: number, lh: number, fill: string): string;
  /** Judul kaya (*kata* serif miring) ter-center; mengembalikan svg & tinggi. */
  rich(font: string, raw: string, cx: number, top: number, maxW: number, maxLines: number, start: number, min: number, fill: string, serifFill: string): { svg: string; h: number; size: number };
}

export interface SosmedInput {
  brand: SlideBrand;
  dna: StyleDna;
  contact: SosmedContact | null;
  /** Logo (svg <image>) atau wordmark yang sudah digambar, diletakkan di (x, yCenter). */
  logo: (x: number, yCenter: number, h: number, ink: string) => string;
  /** Visual slide (data URI). Cover: subjek memudar ke latar; isi: kartu foto. */
  image: { uri: string; kind: "fade" | "card" | "full" } | null;
  en: boolean;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r2 = (v: number) => Math.round(v * 100) / 100;

function mix(a: string, b: string, t: number) {
  const pa = a.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16));
  const pb = b.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16));
  return `#${pa.map((v, k) => Math.round(v + (pb[k] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}
const lum = (h: string) => {
  const [r, g, b] = h.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const onColor = (bg: string) => (lum(bg) > 0.6 ? "#14161F" : "#FFFFFF");

interface Theme {
  bg: string;
  title: string;
  titleSerif: string;
  /** Kotak highlight. */
  pill: string;
  pillInk: string;
  muted: string;
  footer: string;
  footerInk: string;
  footer2: string;
  footer2Ink: string;
  cta: string;
  ctaInk: string;
  titleStroke?: string;
}

function theme(t: SosmedTemplate, b: SlideBrand, hasPhoto: boolean): Theme {
  const P = b.royal;
  const S = b.cyan;
  const bg = sosmedBg(t, P);
  switch (t) {
    case "kuliner": {
      const ink = onColor(bg);
      return { bg, title: ink, titleSerif: S, pill: S, pillInk: onColor(S), muted: mix(ink, bg, 0.25), footer: mix(P, "#000000", 0.35), footer2: S, footer2Ink: onColor(S), footerInk: "#FFFFFF", cta: S, ctaInk: onColor(S) };
    }
    case "cafe": {
      const ink = lum(bg) > 0.62 ? mix(P, "#000000", 0.55) : "#FFFFFF";
      return { bg, title: ink, titleSerif: ink, pill: P, pillInk: onColor(P), muted: mix(ink, bg, 0.3), footer: "#FFFFFF", footerInk: mix(P, "#000000", 0.5), footer2: "#FFFFFF", footer2Ink: mix(P, "#000000", 0.5), cta: P, ctaInk: onColor(P) };
    }
    case "edukasi":
      return { bg, title: P, titleSerif: S, pill: S, pillInk: onColor(S), muted: "#3A4255", footer: P, footerInk: onColor(P), footer2: S, footer2Ink: onColor(S), cta: S, ctaInk: onColor(S), titleStroke: "#FFFFFF" };
    case "game":
      return { bg, title: "#14161F", titleSerif: P, pill: P, pillInk: onColor(P), muted: "#4A5160", footer: "#FFFFFF", footerInk: "#14161F", footer2: "#FFFFFF", footer2Ink: "#14161F", cta: "#111216", ctaInk: "#FFFFFF" };
    case "elegan":
    default: {
      const ink = hasPhoto ? "#FFFFFF" : mix(P, "#1A120B", 0.6);
      return { bg, title: ink, titleSerif: ink, pill: mix(P, "#2A1C10", 0.45), pillInk: "#FFFFFF", muted: hasPhoto ? "#F2ECE4" : "#5B4E42", footer: "#FFFFFF", footerInk: "#2A2520", footer2: "#FFFFFF", footer2Ink: "#2A2520", cta: "#FFFFFF", ctaInk: "#2A2520" };
    }
  }
}

/** Latar per template (+ motif ringan). */
function background(t: SosmedTemplate, th: Theme, id: string, defs: string[], hasFull: boolean) {
  if (hasFull) return "";
  let out = `<rect width="${W}" height="${H}" fill="${th.bg}"/>`;
  if (t === "kuliner") {
    // Motif gelombang (seigaiha) tipis di seluruh latar.
    const c = lum(th.bg) > 0.5 ? "#000000" : "#FFFFFF";
    defs.push(
      `<pattern id="${id}wave" width="80" height="40" patternUnits="userSpaceOnUse"><g fill="none" stroke="${c}" stroke-width="2" opacity=".07"><circle cx="40" cy="40" r="36"/><circle cx="40" cy="40" r="26"/><circle cx="40" cy="40" r="16"/><circle cx="0" cy="20" r="36"/><circle cx="80" cy="20" r="36"/></g></pattern>`,
    );
    out += `<rect width="${W}" height="${H}" fill="url(#${id}wave)"/>`;
  } else if (t === "cafe") {
    defs.push(`<linearGradient id="${id}cafe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(th.bg, "#FFFFFF", 0.25)}"/><stop offset=".55" stop-color="${th.bg}"/><stop offset="1" stop-color="${mix(th.bg, "#000000", 0.12)}"/></linearGradient>`);
    out += `<rect width="${W}" height="${H}" fill="url(#${id}cafe)"/><circle cx="${W - 120}" cy="180" r="260" fill="#FFFFFF" opacity=".12"/>`;
  } else if (t === "edukasi") {
    defs.push(`<linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(th.bg, "#5AB8FF", 0.35)}"/><stop offset=".6" stop-color="${th.bg}"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>`);
    out += `<rect width="${W}" height="${H}" fill="url(#${id}sky)"/>`;
    // Awan sederhana.
    out += `<g fill="#FFFFFF" opacity=".7"><ellipse cx="170" cy="250" rx="140" ry="40"/><ellipse cx="240" cy="230" rx="90" ry="46"/><ellipse cx="900" cy="330" rx="150" ry="38"/><ellipse cx="840" cy="312" rx="80" ry="40"/></g>`;
  } else if (t === "game") {
    out += `<g fill="#14161F" opacity=".035"><path d="M0 0 L520 0 L120 ${H} L0 ${H} Z"/><path d="M${W} 0 L${W} ${H} L620 ${H} Z"/></g>`;
  } else {
    defs.push(`<radialGradient id="${id}el" cx="${W * 0.5}" cy="${H * 0.35}" r="${W}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${th.bg}"/></radialGradient>`);
    out += `<rect width="${W}" height="${H}" fill="url(#${id}el)"/>`;
  }
  return out;
}

const FOOT_H = 132;
const FOOT_Y = H - FOOT_H - 28;

/** Ikon kecil (bentuk sederhana) untuk bar kontak. */
function icon(kind: "wa" | "ig" | "web", x: number, cy: number, color: string) {
  if (kind === "wa")
    return `<g fill="none" stroke="${color}" stroke-width="3.2"><circle cx="${x + 15}" cy="${cy}" r="14"/></g><path d="M${x + 4} ${cy + 15} l3 -8" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/><path d="M${x + 10} ${cy - 5} q2 8 10 10" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (kind === "ig")
    return `<rect x="${x + 1}" y="${cy - 14}" width="28" height="28" rx="8" fill="none" stroke="${color}" stroke-width="3.2"/><circle cx="${x + 15}" cy="${cy}" r="6.5" fill="none" stroke="${color}" stroke-width="3.2"/><circle cx="${x + 23}" cy="${cy - 8}" r="2" fill="${color}"/>`;
  return `<circle cx="${x + 15}" cy="${cy}" r="14" fill="none" stroke="${color}" stroke-width="3.2"/><ellipse cx="${x + 15}" cy="${cy}" rx="6" ry="14" fill="none" stroke="${color}" stroke-width="2.4"/><path d="M${x + 1} ${cy} h28" stroke="${color}" stroke-width="2.4"/>`;
}

function footer(t: SosmedTemplate, th: Theme, c: SosmedContact | null, brand: SlideBrand, tk: TextKit, en: boolean) {
  const cta = (c?.cta || (en ? "Order Now" : "Pesan Sekarang")).slice(0, 22);
  const items: { kind: "wa" | "ig" | "web"; text: string }[] = [];
  if (c?.wa) items.push({ kind: "wa", text: c.wa });
  if (c?.ig || brand.handle) items.push({ kind: "ig", text: (c?.ig || brand.handle).slice(0, 26) });
  if (c?.web) items.push({ kind: "web", text: c.web.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 28) });
  const x0 = 40;
  const w = W - 80;
  const y = FOOT_Y;
  const ctaSize = 28;
  const ctaW = tk.width("bold", cta, ctaSize) + 56;
  let out = "";
  if (t === "kuliner" || t === "edukasi") {
    // Dua warna: blok kontak + blok ajakan.
    const split = x0 + w - ctaW - 40;
    out += `<rect x="${x0}" y="${y}" width="${w}" height="${FOOT_H}" rx="28" fill="${th.footer}"/>`;
    out += `<path d="M${split} ${y} H${x0 + w - 28} a28 28 0 0 1 28 28 V${y + FOOT_H - 28} a28 28 0 0 1 -28 28 H${split - 40} Z" fill="${th.footer2}"/>`;
    out += tk.line("bold", cta, split + 4, y + FOOT_H / 2 - 18, ctaSize, 1.25, th.footer2Ink);
  } else {
    const fill = t === "elegan" ? "#FFFFFF" : th.footer;
    out += `<rect x="${x0}" y="${y}" width="${w}" height="${FOOT_H}" rx="28" fill="${fill}" ${t === "elegan" ? 'fill-opacity=".9"' : ""}/>`;
    out += `<rect x="${x0 + w - ctaW - 24}" y="${y + FOOT_H / 2 - 30}" width="${ctaW}" height="60" rx="30" fill="${th.cta}"/>`;
    out += tk.line("bold", cta, x0 + w - ctaW - 24 + 28, y + FOOT_H / 2 - 17.5, ctaSize, 1.25, th.ctaInk);
  }
  // Kontak: maksimal 3, dibagi rata di sisi kiri.
  const avail = w - ctaW - (t === "kuliner" || t === "edukasi" ? 110 : 80);
  const shown = items.slice(0, 3);
  const slot = shown.length ? avail / shown.length : avail;
  shown.forEach((it, k) => {
    const x = x0 + 32 + k * slot;
    const ink = th.footerInk;
    let size = 25;
    while (size > 17 && tk.width("semibold", it.text, size) > slot - 56) size -= 1;
    out += icon(it.kind, x, y + FOOT_H / 2, ink) + tk.line("semibold", it.text, x + 40, y + FOOT_H / 2 - size * 0.62, size, 1.25, ink);
  });
  return out;
}

/** Kotak highlight dengan teks (dibungkus maks 2 baris), ter-center. Mengembalikan svg & tinggi. */
function highlight(tk: TextKit, fontKey: string, text: string, cy: number, size: number, fill: string, ink: string, tilt = 0) {
  const lines = tk.wrap(fontKey, text, size, 880).slice(0, 2);
  const lh = size * 1.15;
  const pad = size * 0.32;
  const h = lines.length * lh + pad * 2;
  const wMax = Math.max(...lines.map((l) => tk.width(fontKey, l, size))) + pad * 2.6;
  const x = W / 2 - wMax / 2;
  const g = lines.map((l, k) => tk.line(fontKey, l, W / 2 - tk.width(fontKey, l, size) / 2, cy + pad + k * lh, size, 1.15, ink)).join("");
  const rot = tilt ? ` transform="rotate(${tilt} ${W / 2} ${cy + h / 2})"` : "";
  return { svg: `<g${rot}><rect x="${r2(x)}" y="${r2(cy)}" width="${r2(wMax)}" height="${r2(h)}" rx="${r2(size * 0.3)}" fill="${fill}"/>${g}</g>`, h };
}

/** Kartu catatan (kertas + penjepit) berisi daftar bernomor. */
function noteCard(tk: TextKit, items: string[], top: number, bottom: number, th: Theme, brand: SlideBrand, numbered: boolean) {
  const x = 110;
  const w = W - 220;
  const avail = bottom - top - 60;
  let size = 44;
  let lines: string[][] = [];
  const fit = () => {
    lines = items.map((it) => tk.wrap("semibold", it, size, w - 150));
    const h = lines.reduce((a, l) => a + l.length * size * 1.3 + 26, 0) + 110;
    return h;
  };
  while (fit() > avail && size > 24) size -= 2;
  const h = Math.min(avail, fit());
  const y = top + 40 + Math.max(0, (avail - h) / 2);
  let out = `<g transform="rotate(-1.2 ${W / 2} ${y + h / 2})"><rect x="${x + 10}" y="${y + 14}" width="${w}" height="${h}" rx="10" fill="#000000" opacity=".12"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#FFFFFF"/>`;
  // Garis buku tulis tipis.
  for (let ly = y + 70; ly < y + h - 10; ly += 44) out += `<path d="M${x + 24} ${ly} H${x + w - 24}" stroke="#7FA6D9" stroke-opacity=".25" stroke-width="2"/>`;
  out += `</g>`;
  // Penjepit.
  out += `<rect x="${W / 2 - 70}" y="${y - 30}" width="140" height="58" rx="14" fill="#9AA1AD"/><rect x="${W / 2 - 52}" y="${y - 16}" width="104" height="22" rx="8" fill="#D9DDE3"/>`;
  let cy = y + 64;
  lines.forEach((ls, k) => {
    const n = String(k + 1);
    if (numbered) {
      out += `<circle cx="${x + 62}" cy="${cy + size * 0.65}" r="26" fill="${brand.royal}"/>` + tk.line("bold", n, x + 62 - tk.width("bold", n, 28) / 2, cy + size * 0.65 - 17.5, 28, 1.25, onColor(brand.royal));
    } else {
      out += `<rect x="${x + 44}" y="${cy + size * 0.65 - 15}" width="30" height="30" rx="7" fill="${brand.royal}"/><path d="M${x + 51} ${cy + size * 0.65} l6 6 l11 -12" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    ls.forEach((l, j) => (out += tk.line("semibold", l, x + 110, cy + j * size * 1.3, size, 1.3, "#1E2230")));
    cy += ls.length * size * 1.3 + 26;
  });
  return out;
}

/** Label harga miring (burst bulat). */
function priceBadge(tk: TextKit, text: string, cx: number, cy: number, th: Theme, brand: SlideBrand) {
  const lines = tk.wrap("heavy", text, 40, 230).slice(0, 2);
  const size = lines.length > 1 ? 34 : 42;
  const r = 128;
  const pts: string[] = [];
  for (let k = 0; k < 24; k++) {
    const a = (Math.PI * 2 * k) / 24;
    const rr = k % 2 ? r : r * 0.9;
    pts.push(`${r2(cx + Math.cos(a) * rr)},${r2(cy + Math.sin(a) * rr)}`);
  }
  const fill = brand.cyan;
  const ink = onColor(fill);
  const g = lines.map((l, k) => tk.line("heavy", l, cx - tk.width("heavy", l, size) / 2, cy - (lines.length * size * 1.1) / 2 + k * size * 1.1, size, 1.1, ink)).join("");
  return `<g transform="rotate(-8 ${cx} ${cy})"><polygon points="${pts.join(" ")}" fill="${fill}" stroke="#FFFFFF" stroke-width="6"/>${g}</g>`;
}

/**
 * Satu slide template sosmed. Semua jenis slide (cover, poin, daftar, statement, ajakan) memakai kerangka yang sama:
 * logo → judul (+ kotak highlight) → isi (visual / kartu catatan / VS / teks) → bar kontak.
 */
export function sosmedSlideSvg(s: Slide, i: number, n: number, inp: SosmedInput, tk: TextKit) {
  const t = (inp.dna.template ?? "kuliner") as SosmedTemplate;
  const b = inp.brand;
  const id = `so${i}`;
  const defs: string[] = [];
  const fullPhoto = inp.image?.kind === "full";
  const th = theme(t, b, fullPhoto);
  const titleFont = inp.dna.font;
  let body = background(t, th, id, defs, fullPhoto);

  if (fullPhoto && inp.image) {
    // Elegan: foto penuh lembut + gradasi gelap di area judul (bawah) agar teks terbaca.
    defs.push(`<linearGradient id="${id}fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></linearGradient>`);
    body += `<image href="${inp.image.uri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/><rect width="${W}" height="${H}" fill="url(#${id}fade)"/>`;
  }

  // Logo kiri atas + penanda slide kanan atas.
  body += inp.logo(64, 104, 76, th.title === "#FFFFFF" ? "#FFFFFF" : "#14161F");
  if (n > 1) {
    const tag = `${i + 1}/${n}`;
    const tw = tk.width("bold", tag, 24) + 36;
    body += `<rect x="${W - 64 - tw}" y="78" width="${tw}" height="50" rx="25" fill="${fullPhoto ? "#FFFFFF" : th.pill}" fill-opacity="${fullPhoto ? 0.85 : 1}"/>` + tk.line("bold", tag, W - 64 - tw + 18, 87, 24, 1.3, fullPhoto ? "#2A2520" : th.pillInk);
  }

  const footerTop = FOOT_Y - 24;
  const cover = i === 0;
  const isCta = s.type === "cta";
  const elegan = t === "elegan";

  // ---- Judul ----
  let y = elegan && fullPhoto ? 0 : 200;
  const titleParts: string[] = [];
  let titleH = 0;
  const label = s.label?.trim();
  if (label && !elegan) {
    const lw = tk.width("bold", label, 26) + 44;
    titleParts.push(`<rect x="${W / 2 - lw / 2}" y="${y}" width="${lw}" height="50" rx="25" fill="${th.pill}" fill-opacity=".14" stroke="${th.pill}" stroke-width="2"/>` + tk.line("bold", label, W / 2 - (lw - 44) / 2, y + 9, 26, 1.25, th.title));
    y += 74;
    titleH += 74;
  }
  const title = s.title?.trim() || "";
  const start = (cover ? 104 : 88) * inp.dna.titleScale * (elegan ? 1.1 : 1);
  if (title) {
    const r = tk.rich(titleFont, title, W / 2, y, 920, cover ? 3 : 3, start, 54, th.title, th.titleSerif);
    let svg = r.svg;
    if (th.titleStroke) svg = svg.replace(/<g fill="([^"]+)"/g, `<g fill="$1" stroke="${th.titleStroke}" stroke-width="5" paint-order="stroke" stroke-linejoin="round"`);
    titleParts.push(svg);
    y += r.h + 14;
    titleH += r.h + 14;
    const accent = s.accent?.trim();
    if (accent) {
      const hl = highlight(tk, titleFont, accent.replace(/\*/g, ""), y, Math.min(r.size * 0.82, 76), th.pill, th.pillInk, t === "kuliner" || t === "game" ? -1.5 : 0);
      titleParts.push(hl.svg);
      y += hl.h + 18;
      titleH += hl.h + 18;
    }
  }
  const sub = s.sub?.trim();
  if (sub && !isCta) {
    const ls = tk.wrap("medium", sub, 30, 820).slice(0, 2);
    ls.forEach((l, k) => titleParts.push(tk.line("medium", l, W / 2 - tk.width("medium", l, 30) / 2, y + k * 40, 30, 1.3, th.muted)));
    y += ls.length * 40 + 12;
    titleH += ls.length * 40 + 12;
  }

  if (elegan && fullPhoto) {
    // Judul elegan di bawah, di atas bar kontak.
    const top = footerTop - titleH - 30;
    body += `<g transform="translate(0 ${r2(top)})">${titleParts.join("")}</g>`;
  } else {
    body += titleParts.join("");
  }

  // ---- Isi ----
  const contentTop = elegan && fullPhoto ? 170 : y + 10;
  const contentBottom = elegan && fullPhoto ? footerTop - titleH - 40 : footerTop;
  const items = (s.items ?? []).filter(Boolean);
  const options = (s.options ?? []).filter(Boolean);

  if (items.length >= 2 && contentBottom - contentTop > 260) {
    body += noteCard(tk, items, contentTop, contentBottom, th, b, s.type !== "list" || /^\d/.test(items[0]) ? true : /^(rp|\d)/i.test(items[0]) ? false : true);
  } else if (options.length >= 2 && contentBottom - contentTop > 260) {
    // VS: dua kartu + lingkaran VS.
    const cw = 440;
    const ch = Math.min(contentBottom - contentTop - 60, 600);
    const cy = contentTop + Math.max(20, (contentBottom - contentTop - ch) / 2);
    [options[0], options[1]].forEach((op, k) => {
      const x = k === 0 ? 60 : W - 60 - cw;
      let size = 52;
      let ls = tk.wrap("heavy", op, size, cw - 70);
      while (ls.length > 4 && size > 32) ls = tk.wrap("heavy", op, (size -= 4), cw - 70);
      ls = ls.slice(0, 4);
      const fill = k === 0 ? "#FFFFFF" : mix(b.royal, "#FFFFFF", 0.88);
      body += `<rect x="${x + 8}" y="${cy + 12}" width="${cw}" height="${ch}" rx="32" fill="#000" opacity=".12"/><rect x="${x}" y="${cy}" width="${cw}" height="${ch}" rx="32" fill="${fill}"/>` + ls.map((l, j) => tk.line("heavy", l, x + cw / 2 - tk.width("heavy", l, size) / 2, cy + ch / 2 - (ls.length * size * 1.2) / 2 + j * size * 1.2, size, 1.2, "#1E2230")).join("");
    });
    body += `<circle cx="${W / 2}" cy="${cy + ch / 2}" r="80" fill="${b.cyan}" stroke="#FFFFFF" stroke-width="8"/>` + tk.line("heavy", "VS", W / 2 - tk.width("heavy", "VS", 56) / 2, cy + ch / 2 - 35, 56, 1.25, onColor(b.cyan));
  } else if (inp.image && !fullPhoto) {
    const room = contentBottom - contentTop;
    if (inp.image.kind === "fade") {
      // Subjek cover dibuat besar (boleh sedikit menimpa tepi atas bar kontak seperti referensi).
      const size = Math.min(room + 100, 980);
      body += `<image href="${inp.image.uri}" x="${r2(W / 2 - size / 2)}" y="${r2(contentBottom - size + 80)}" width="${r2(size)}" height="${r2(size)}"/>`;
    } else {
      const bodyText = s.body?.trim();
      const textH = bodyText ? 150 : 0;
      const ih = Math.max(260, Math.min(room - textH - 20, 620));
      const iw = Math.min(900, ih * 1.25);
      const ix = W / 2 - iw / 2;
      defs.push(`<clipPath id="${id}card"><rect x="${r2(ix)}" y="${r2(contentTop)}" width="${r2(iw)}" height="${r2(ih)}" rx="32"/></clipPath>`);
      body += `<rect x="${r2(ix + 10)}" y="${r2(contentTop + 14)}" width="${r2(iw)}" height="${r2(ih)}" rx="32" fill="#000" opacity=".14"/><image href="${inp.image.uri}" x="${r2(ix)}" y="${r2(contentTop)}" width="${r2(iw)}" height="${r2(ih)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}card)"/><rect x="${r2(ix)}" y="${r2(contentTop)}" width="${r2(iw)}" height="${r2(ih)}" rx="32" fill="none" stroke="#FFFFFF" stroke-width="8"/>`;
      if (bodyText) {
        const ls = tk.wrap("semibold", bodyText, 34, 880).slice(0, 3);
        ls.forEach((l, k) => (body += tk.line("semibold", l, W / 2 - tk.width("semibold", l, 34) / 2, contentTop + ih + 28 + k * 44, 34, 1.3, th.muted)));
      }
    }
  } else if (s.body?.trim() || isCta) {
    // Teks di kartu (statement/testimoni/poin tanpa visual) atau tombol ajakan.
    const text = s.body?.trim() || sub || "";
    const fs = 44;
    const ls = text ? tk.wrap("semibold", text, fs, 760).slice(0, 6) : [];
    const ch = ls.length * fs * 1.35 + (isCta && s.button ? 170 : 0) + 110;
    const cy = contentTop + Math.max(20, (contentBottom - contentTop - ch) / 2);
    body += `<rect x="110" y="${r2(cy)}" width="${W - 220}" height="${r2(ch)}" rx="32" fill="#FFFFFF" fill-opacity="${t === "game" ? 1 : 0.94}"/>`;
    if (s.type === "statement") body += tk.line("heavy", "“", 160, cy - 20, 140, 1, b.royal);
    ls.forEach((l, k) => (body += tk.line("semibold", l, W / 2 - tk.width("semibold", l, fs) / 2, cy + 55 + k * fs * 1.35, fs, 1.35, "#1E2230")));
    if (isCta && s.button) {
      const bt = s.button.slice(0, 30);
      const bw = tk.width("bold", bt, 40) + 100;
      body += `<rect x="${W / 2 - bw / 2}" y="${r2(cy + ch - 135)}" width="${r2(bw)}" height="92" rx="46" fill="${th.cta === "#FFFFFF" ? b.royal : th.cta}"/>` + tk.line("bold", bt, W / 2 - (bw - 100) / 2, cy + ch - 135 + 20, 40, 1.3, th.cta === "#FFFFFF" ? onColor(b.royal) : th.ctaInk);
    }
  }

  // Keterangan bergaris (elegan, dari "corners") di sisi visual.
  if (elegan && s.corners?.length && (inp.image || fullPhoto)) {
    const notes = s.corners.slice(0, 2);
    notes.forEach((c, k) => {
      const left = true;
      const yy = 300 + k * 180;
      const x = left ? 90 : W - 90;
      const ls = tk.wrap("semibold", c, 24, 230).slice(0, 2);
      const tw = Math.max(...ls.map((l) => tk.width("semibold", l, 24))) + 30;
      const bx = left ? x : x - tw;
      body += `<rect x="${r2(bx)}" y="${yy}" width="${r2(tw)}" height="${ls.length * 32 + 22}" rx="10" fill="${th.pill}" fill-opacity=".85"/>` + ls.map((l, j) => tk.line("semibold", l, bx + 15, yy + 11 + j * 32, 24, 1.3, "#FFFFFF")).join("");
      const lx = left ? bx + tw : bx;
      body += `<path d="M${r2(lx)} ${yy + 20} L${left ? lx + 120 : lx - 120} ${yy + 70}" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="${left ? lx + 120 : lx - 120}" cy="${yy + 70}" r="6" fill="#FFFFFF"/>`;
    });
  }

  // Label harga.
  if (s.price?.trim()) body += priceBadge(tk, s.price.trim(), W - 200, elegan && fullPhoto ? 300 : Math.min(footerTop - 170, Math.max(contentTop + 150, 700)), th, b);

  body += footer(t, th, inp.contact, b, tk, inp.en);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join("")}</defs>${body}</svg>`;
}

export { esc };
