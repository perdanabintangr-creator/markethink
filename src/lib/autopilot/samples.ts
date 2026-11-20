import type { Slide } from "./slides";

/** Contoh carousel untuk pratinjau gaya desain (dirender dengan warna & logo Brand Kit pelanggan). */
export function sampleSlides(en = false): Slide[] {
  return en
    ? [
        { type: "cover", title: "Your posts are *fine*.", accent: "Your hook isn't.", sub: "Fix it in 3 steps. Save this before your next carousel.", corners: ["Plan write post", "Brand level up", "Save share apply", "Swipe to continue"] },
        { type: "point", label: "STEP #1", num: "01", title: "Lead with the", accent: "problem", body: "People stop scrolling for a problem they recognise, not for a product name." },
        { type: "list", label: "SUMMARY", title: "Checklist before posting", items: ["Hook under 8 words", "One idea per slide", "Summary slide people screenshot", "One clear call to action"] },
        { type: "cta", title: "Save it now,", accent: "use it tomorrow.", sub: "Follow for weekly content that actually sells.", button: "Follow" },
      ]
    : [
        { type: "cover", title: "Kontenmu *bagus*.", accent: "Hook-nya belum.", sub: "Perbaiki dalam 3 langkah. Simpan dulu sebelum posting.", corners: ["Ide tulis tayang", "Brand naik kelas", "Simpan bagikan terapkan", "Geser untuk lanjut"] },
        { type: "point", label: "LANGKAH #1", num: "01", title: "Buka dengan", accent: "masalah", body: "Orang berhenti scroll karena masalah yang mereka kenali, bukan karena nama produk." },
        { type: "list", label: "RANGKUMAN", title: "Cek sebelum posting", items: ["Hook kurang dari 8 kata", "Satu ide per slide", "Slide rangkuman untuk di-screenshot", "Satu ajakan yang jelas"] },
        { type: "cta", title: "Simpan dulu,", accent: "pakai besok.", sub: "Follow untuk konten mingguan yang bikin jualan.", button: "Follow" },
      ];
}
