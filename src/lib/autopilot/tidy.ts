import { brandHashtag, capHashtags, fixCaption, lintCaption, lintSlides } from "./lint";
import type { Slide } from "./slides";
import type { GeneratedPost } from "./plan";

/** Rapikan satu post hasil AI: format slide sesuai jenis, caption dibersihkan, hashtag merek, hasil linter. */
export function tidyPost(p: GeneratedPost, brandName: string, keywords: string[]) {
  // `image` hanya boleh diisi server (path storage), bukan dari keluaran AI.
  let slides: Slide[] = (p.slides ?? []).map((sl) => {
    const c = { ...sl };
    delete c.image;
    return c;
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
  const c = lintCaption(caption, { brandName, keywords });
  const s = lintSlides(slides, p.kind);
  if (p.kind === "reel" && !p.script?.trim()) s.fails.push("Naskah Reel belum ada.");
  return {
    slides,
    caption,
    script: p.kind === "reel" ? fixCaption(p.script ?? "") : null,
    alt_text: p.kind === "reel" ? null : p.alt_text ? fixCaption(p.alt_text) : null,
    lint: { fails: [...c.fails, ...s.fails], warns: [...c.warns, ...s.warns] },
  };
}

