/**
 * Rapikan deck sesuai foto yang benar-benar ada (paket Free tanpa foto AI, Starter hanya cover, atau foto gagal dibuat):
 * slide yang butuh foto diubah ke layout teks yang rapi — tidak ada kotak foto kosong di file maupun pratinjau.
 * Murni (tanpa pptxgenjs) supaya bisa dipakai server & browser.
 */
interface FitSlide {
  layout?: string;
  title?: string;
  bullets?: string[];
  cards?: { icon?: string; title?: string; text?: string }[];
  gallery?: { caption?: string; image_prompt?: string; image_id?: string }[];
  image_prompt?: string;
  image_id?: string;
}
interface FitDeck<S extends FitSlide> {
  cover_image_prompt?: string;
  cover_image_id?: string;
  slides: S[];
}

export function fitDeckToImages<S extends FitSlide, D extends FitDeck<S>>(deck: D, hasImage: (key: string) => boolean): D {
  const slides = deck.slides.map((s, i) => {
    const key = String(i);
    const out = { ...s } as S;
    if (!hasImage(key)) {
      delete out.image_prompt;
      delete out.image_id;
      if (s.layout === "image_text") out.layout = "bullets";
      if (s.layout === "product") out.layout = (s.cards?.length ?? 0) >= 2 ? "cards" : "bullets";
    }
    if (s.layout === "gallery") {
      const items = (s.gallery ?? []).filter((_, k) => hasImage(`${i}-g${k}`));
      if (items.length >= 2) out.gallery = items;
      else {
        const captions = (s.gallery ?? []).map((g) => g.caption ?? "").filter(Boolean);
        delete out.gallery;
        if (captions.length >= 2) {
          out.layout = "cards";
          out.cards = captions.slice(0, 6).map((c) => ({ icon: "sparkles", title: c.slice(0, 40), text: c.length > 40 ? c : "" }));
        } else {
          out.layout = "bullets";
          out.bullets = [...(s.bullets ?? []), ...captions].slice(0, 6);
        }
      }
    }
    return out;
  });
  const fitted = { ...deck, slides };
  if (!hasImage("cover")) {
    delete fitted.cover_image_prompt;
    delete fitted.cover_image_id;
  }
  return fitted;
}
