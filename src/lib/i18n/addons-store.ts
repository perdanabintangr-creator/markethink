import type { Lang } from "./dict";

/** Teks halaman Toko Add-on Smart Tools (eceran & bundel). */
const id = {
  title: "Toko Add-on",
  desc: "Beli Smart Tools satuan sesuai kebutuhan, tanpa ganti paket. Setiap add-on aktif 30 hari.",
  memberNote: "Harga khusus member Pro & Promax: semua add-on dan bundel diskon 15%.",
  upsellNote: "Upgrade ke Pro atau Promax untuk diskon 15% semua add-on dan bundel.",
  seePlans: "Lihat paket",
  bundles: "Bundel hemat",
  bundlesDesc: "Beberapa add-on dalam satu pembelian, lebih murah dari beli satu per satu.",
  retail: "Eceran",
  retailDesc: "Pilih satu kelompok tool yang kamu butuhkan saja.",
  includes: "Isi bundel",
  uses: (n: number) => `${n}× hasil/bulan`,
  perMonth: "/ bulan",
  save: (pct: number) => `Hemat ${pct}%`,
  member: "Diskon member 15%",
  active: (left: number, until: string) => `Aktif s.d. ${until} · sisa ${left} hasil bulan ini`,
  buy: "Beli",
  buyBundle: "Beli bundel",
  extend: "Perpanjang",
  bundleSummary: (price: string, n: number) => `${price} / bulan · ${n} add-on sekaligus · aktif 30 hari.`,
  howTitle: "Cara kerja add-on",
  how: [
    "Add-on dipakai lebih dulu sebelum kuota paket, jadi kuota paketmu lebih awet.",
    "Hasil dari add-on memakai otak Senior. Pilih otak Head atau Director bila ingin memakai kuota paket.",
    "Kuota hasil terisi lagi tiap bulan sejak tanggal pembelian, selama add-on aktif.",
  ],
  storeLink: "Toko Add-on",
  storeLinkDesc: "Beli tool satuan atau bundel hemat, tanpa ganti paket.",
};

const en: typeof id = {
  title: "Add-on Store",
  desc: "Buy individual Smart Tools when you need them, no plan change. Each add-on is active for 30 days.",
  memberNote: "Member pricing for Pro & Promax: 15% off every add-on and bundle.",
  upsellNote: "Upgrade to Pro or Promax to get 15% off every add-on and bundle.",
  seePlans: "See plans",
  bundles: "Value bundles",
  bundlesDesc: "Several add-ons in one purchase, cheaper than buying them one by one.",
  retail: "Single add-ons",
  retailDesc: "Pick just the tool group you need.",
  includes: "Includes",
  uses: (n: number) => `${n} results/month`,
  perMonth: "/ month",
  save: (pct: number) => `Save ${pct}%`,
  member: "15% member discount",
  active: (left: number, until: string) => `Active until ${until} · ${left} results left this month`,
  buy: "Buy",
  buyBundle: "Buy bundle",
  extend: "Extend",
  bundleSummary: (price: string, n: number) => `${price} / month · ${n} add-ons at once · active for 30 days.`,
  howTitle: "How add-ons work",
  how: [
    "Add-ons are used before your plan quota, so your plan quota lasts longer.",
    "Add-on results use the Senior brain. Choose Head or Director to use your plan quota instead.",
    "Results refill every month from the purchase date while the add-on is active.",
  ],
  storeLink: "Add-on Store",
  storeLinkDesc: "Buy single tools or value bundles, no plan change.",
};

export const addonsStoreText = (lang: Lang | null | undefined) => (lang === "en" ? en : id);
