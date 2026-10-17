/** Pilihan gaya jawaban (Pengaturan → Personalisasi). Aman dipakai di client. */
export const RESPONSE_STYLES = [
  { id: "seimbang", label: "Seimbang", desc: "Default — jelas, lengkap secukupnya." },
  { id: "santai", label: "Santai", desc: "Akrab seperti rekan kerja, bahasa sehari-hari." },
  { id: "profesional", label: "Profesional", desc: "Formal & rapi, siap diteruskan ke atasan/klien." },
  { id: "singkat", label: "Singkat & padat", desc: "Langsung ke poin, banyak bullet, tanpa basa-basi." },
] as const;
export type ResponseStyle = (typeof RESPONSE_STYLES)[number]["id"];
