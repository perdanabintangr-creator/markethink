import type { Lang } from "./dict";

/**
 * Isi kartu paket (gaya halaman harga ChatGPT/Claude): slogan, deskripsi, "Semua di X, plus:" & keunggulan berikon.
 * Selaras dengan feature flag di database (batas harian Free, tier otak, Tools Pro, Agent, project & penyimpanan).
 */
export type PlanIcon =
  | "chat"
  | "web"
  | "image"
  | "project"
  | "brain"
  | "tools"
  | "deck"
  | "photo"
  | "privacy"
  | "sharp"
  | "agent"
  | "visual"
  | "edit"
  | "crown"
  | "signature"
  | "quota"
  | "team"
  | "support";

export interface PlanDetail {
  headline: string;
  desc: string;
  /** Besar kuota tanpa angka, mis. "Kuota lebih besar". */
  quota: string;
  /** Judul daftar keunggulan, mis. "Semua di Starter, plus:". */
  includes?: string;
  features: { icon: PlanIcon; text: string }[];
  /** Catatan kecil di kaki kartu. */
  footnote?: string;
}

const id = {
  personal: "Personal",
  business: "Tim & Agency",
  getFree: "Pakai gratis",
  monthly: "/ bulan",
  footer:
    "Satu kuota bulanan untuk semua fitur (chat, riset, gambar, PPT, Tools Pro & Agent), dihitung dari pemakaian nyata dan direset tiap tanggal 1.",
  plans: {
    beta: {
      headline: "Kenalan dengan Markethink",
      desc: "Coba asisten marketing AI untuk kebutuhan ringan sehari-hari.",
      quota: "Kuota percobaan",
      features: [
        { icon: "chat", text: "Chat harian dengan otak Junior" },
        { icon: "web", text: "Riset web, baca file & link" },
        { icon: "image", text: "Coba gambar AI, PPT & carousel" },
        { icon: "project", text: "Project & Brand Kit" },
        { icon: "quota", text: "Penyimpanan file dasar" },
      ],
      footnote: "Diproses Google Gemini (layanan gratis), jadi isi chat dapat dipakai Google untuk meningkatkan layanannya.",
    },
    starter: {
      headline: "Asisten marketing harian",
      desc: "Untuk UMKM & freelancer yang butuh konten dan strategi rutin.",
      quota: "Kuota bulanan standar",
      includes: "Semua di Free, plus:",
      features: [
        { icon: "brain", text: "Otak Junior & Senior, tanpa batas harian" },
        { icon: "tools", text: "Semua Tools Pro: strategi, riset, konten, iklan & laporan" },
        { icon: "deck", text: "PPT, carousel & poster IG/TikTok" },
        { icon: "photo", text: "Gambar AI & Foto Produk Studio" },
        { icon: "privacy", text: "Otak Claude dengan privasi penuh" },
        { icon: "project", text: "Lebih banyak project & penyimpanan" },
      ],
    },
    pro: {
      headline: "Untuk marketer profesional",
      desc: "Hasil lebih tajam & kerja otomatis untuk marketing officer dan agency kecil.",
      quota: "Kuota lebih besar",
      includes: "Semua di Starter, plus:",
      features: [
        { icon: "sharp", text: "Otak Associate (lebih tajam)" },
        { icon: "agent", text: "Markethink Agent: satu tujuan, beberapa tools jalan otomatis" },
        { icon: "visual", text: "Visual premium: PPT penuh foto AI" },
        { icon: "edit", text: "Edit gambar pintar, layout dirapikan otomatis" },
        { icon: "project", text: "Project & penyimpanan lebih lega" },
      ],
    },
    promax: {
      headline: "Kualitas setara agency",
      desc: "Untuk agency & tim yang presentasi ke klien setiap minggu.",
      quota: "Kuota paling besar",
      includes: "Semua di Pro, plus:",
      features: [
        { icon: "crown", text: "Otak Director (paling cerdas)" },
        { icon: "signature", text: "PPT Signature: desain ala agency + PDF" },
        { icon: "quota", text: "Kuota paling besar" },
        { icon: "project", text: "Project & penyimpanan paling lega" },
      ],
    },
  } as Record<string, PlanDetail>,
  team: {
    name: "Tim & Agency",
    badge: "Segera hadir",
    headline: "Satu workspace untuk seluruh tim",
    desc: "Untuk agency & tim marketing yang menangani banyak brand/klien sekaligus.",
    features: [
      { icon: "team", text: "Banyak anggota tim dalam satu akun" },
      { icon: "project", text: "Project & Brand Kit per klien, dipakai bersama" },
      { icon: "quota", text: "Kuota bersama, tagihan satu pintu" },
      { icon: "support", text: "Pendampingan onboarding tim" },
    ] as PlanDetail["features"],
    cta: "Daftar minat",
    sent: "Terima kasih! Kami kabari begitu paket tim dibuka.",
    note: "Butuh sekarang? Sementara itu, tiap anggota tim bisa memakai paket Pro/Promax.",
  },
};

const en: typeof id = {
  personal: "Personal",
  business: "Team & Agency",
  getFree: "Use for free",
  monthly: "/ month",
  footer:
    "One monthly quota for everything (chat, research, images, PPT, Pro Tools & Agent), based on actual usage and reset on the 1st of each month.",
  plans: {
    beta: {
      headline: "Meet Markethink",
      desc: "Try an AI marketing assistant for light everyday needs.",
      quota: "Trial quota",
      features: [
        { icon: "chat", text: "Daily chats with the Junior brain" },
        { icon: "web", text: "Web research, read files & links" },
        { icon: "image", text: "Try AI images, PPT & carousels" },
        { icon: "project", text: "Projects & Brand Kit" },
        { icon: "quota", text: "Basic file storage" },
      ],
      footnote: "Processed by Google Gemini (free service), so chats may be used by Google to improve its services.",
    },
    starter: {
      headline: "Your daily marketing assistant",
      desc: "For small businesses & freelancers who need content and strategy every day.",
      quota: "Standard monthly quota",
      includes: "Everything in Free, plus:",
      features: [
        { icon: "brain", text: "Junior & Senior brains, no daily limits" },
        { icon: "tools", text: "All Pro Tools: strategy, research, content, ads & reports" },
        { icon: "deck", text: "PPT, carousels & IG/TikTok posters" },
        { icon: "photo", text: "AI images & Product Photo Studio" },
        { icon: "privacy", text: "Claude brain with full privacy" },
        { icon: "project", text: "More projects & storage" },
      ],
    },
    pro: {
      headline: "For professional marketers",
      desc: "Sharper results & automated work for marketing officers and small agencies.",
      quota: "Bigger quota",
      includes: "Everything in Starter, plus:",
      features: [
        { icon: "sharp", text: "Associate brain (sharper)" },
        { icon: "agent", text: "Markethink Agent: one goal, several tools run automatically" },
        { icon: "visual", text: "Premium visuals: PPT full of AI photos" },
        { icon: "edit", text: "Smart image editing that tidies the layout for you" },
        { icon: "project", text: "Roomier projects & storage" },
      ],
    },
    promax: {
      headline: "Agency-grade quality",
      desc: "For agencies & teams presenting to clients every week.",
      quota: "Largest quota",
      includes: "Everything in Pro, plus:",
      features: [
        { icon: "crown", text: "Director brain (smartest)" },
        { icon: "signature", text: "Signature PPT: agency-style design + PDF" },
        { icon: "quota", text: "Largest quota" },
        { icon: "project", text: "Most room for projects & storage" },
      ],
    },
  },
  team: {
    name: "Team & Agency",
    badge: "Coming soon",
    headline: "One workspace for your whole team",
    desc: "For agencies & marketing teams handling many brands/clients at once.",
    features: [
      { icon: "team", text: "Multiple team members in one account" },
      { icon: "project", text: "Shared projects & Brand Kits per client" },
      { icon: "quota", text: "Shared quota, single invoice" },
      { icon: "support", text: "Guided team onboarding" },
    ],
    cta: "Join the waitlist",
    sent: "Thanks! We'll let you know as soon as team plans open.",
    note: "Need it now? Meanwhile, each team member can use a Pro/Promax plan.",
  },
};

export const plansText = (lang: Lang | null | undefined) => (lang === "en" ? en : id);
