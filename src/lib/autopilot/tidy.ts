import { brandHashtag, capHashtags, fixCaption, lintCaption, lintSlides } from "./lint";
import type { Slide } from "./slides";
import type { GeneratedPost } from "./plan";

/** Rapikan satu post hasil AI: format slide sesuai jenis, caption dibersihkan, hashtag merek, hasil linter. */
export function tidyPost(p: GeneratedPost, brandName: string, keywords: string[], forbidden?: string | null) {
  // `image` hanya boleh diisi server (path storage), bukan dari keluaran AI.
  let slides: Slide[] = (p.slides ?? []).map((sl) => {
    const c = { ...sl };
    delete c.image;
    return dedupeAccent(c);
  });
  if (p.kind === "reel") slides = [];
  else if (p.kind === "image") slides = slides.slice(0, 1);
  else slides = slides.slice(0, 10);
  const tag = brandHashtag(brandName);
  let caption = capHashtags(fixCaption(p.caption), tag);
  const tags = caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  if (tag && tags.length < 5 && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
    caption = /\n#[^\n]*$/.test(caption) ? `${caption} ${tag}` : `${caption}\n\n${tag}`;
  }
  const c = lintCaption(caption, { brandName, keywords, forbidden });
  const s = lintSlides(slides, p.kind, forbidden);
  if (p.kind === "reel" && !p.script?.trim()) s.fails.push("Naskah Reel belum ada.");
  return {
    slides,
    caption,
    script: p.kind === "reel" ? fixCaption(p.script ?? "") : null,
    alt_text: p.kind === "reel" ? null : p.alt_text ? fixCaption(p.alt_text) : null,
    lint: { fails: [...c.fails, ...s.fails], warns: [...c.warns, ...s.warns] },
  };
}


/** Cegah kata dobel judul–aksen ("Pilih pose natural" + "natural"): buang bagian judul yang diulang aksen. */
export function dedupeAccent(s: Slide): Slide {
  if (!s.title || !s.accent) return s;
  const norm = (x: string) => x.replace(/\*/g, "").replace(/[.,!?]+$/g, "").trim().toLowerCase();
  const t = norm(s.title);
  const a = norm(s.accent);
  if (!a) return s;
  if (t === a) return { ...s, accent: undefined };
  if (t.endsWith(` ${a}`)) {
    const cut = s.title.replace(/\*/g, "").trim().slice(0, -a.length - 1).trim();
    return cut ? { ...s, title: cut } : s;
  }
  // Aksen sudah muncul di tengah/awal judul ("Jam kosong sebelum naik kereta" + "jam kosong") → aksen dibuang.
  if (a.length >= 3 && ` ${t} `.includes(` ${a} `)) return { ...s, accent: undefined };
  return s;
}
