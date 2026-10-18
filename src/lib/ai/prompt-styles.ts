/** Pilihan gaya jawaban (Pengaturan → Personalisasi). Aman dipakai di client. labelEn/descEn = tampilan bahasa Inggris (id tetap). */
export const RESPONSE_STYLES = [
  { id: "seimbang", label: "Seimbang", desc: "Default: jelas, lengkap secukupnya.", labelEn: "Balanced", descEn: "Default: clear, as complete as needed." },
  { id: "santai", label: "Santai", desc: "Akrab seperti rekan kerja, bahasa sehari-hari.", labelEn: "Casual", descEn: "Friendly like a coworker, everyday language." },
  { id: "profesional", label: "Profesional", desc: "Formal & rapi, siap diteruskan ke atasan/klien.", labelEn: "Professional", descEn: "Formal & polished, ready to forward to your boss/client." },
  { id: "singkat", label: "Singkat & padat", desc: "Langsung ke poin, banyak bullet, tanpa basa-basi.", labelEn: "Short & concise", descEn: "Straight to the point, lots of bullets, no fluff." },
] as const;
export type ResponseStyle = (typeof RESPONSE_STYLES)[number]["id"];
