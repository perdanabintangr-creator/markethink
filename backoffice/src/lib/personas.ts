export const ROLES = [
  { id: "marketing_pro", label: "Marketing profesional", desc: "Brand, digital, atau agency" },
  { id: "umkm_owner", label: "Owner UMKM", desc: "Punya usaha & urus marketing sendiri" },
  { id: "student", label: "Mahasiswa", desc: "Marketing, komunikasi, atau bisnis" },
  { id: "freelancer", label: "Freelancer", desc: "Social media specialist, copywriter, creator" },
  { id: "other", label: "Profesi lain", desc: "Sales, founder, dan lainnya" },
] as const;

export const INDUSTRIES = [
  "F&B / Kuliner",
  "Fashion & Aksesoris",
  "Kecantikan & Skincare",
  "Kesehatan & Wellness",
  "Teknologi / SaaS / Aplikasi",
  "Pendidikan",
  "Properti",
  "Otomotif",
  "Keuangan / Fintech",
  "Travel & Hospitality",
  "Retail / E-commerce",
  "Jasa Profesional / B2B",
  "Kreatif / Media / Hiburan",
  "Lainnya",
];

export const EXPERIENCE = [
  { id: "beginner", label: "Pemula", desc: "Baru mulai belajar marketing" },
  { id: "intermediate", label: "Menengah", desc: "1–3 tahun praktik" },
  { id: "advanced", label: "Mahir", desc: "3+ tahun / memimpin tim" },
] as const;

export const GOALS = [
  "Naikkan penjualan",
  "Bangun brand awareness",
  "Bikin konten rutin",
  "Susun strategi & campaign",
  "Belajar marketing",
  "Melayani klien (agency/freelance)",
];

export function roleLabel(id: string | null | undefined) {
  return ROLES.find((r) => r.id === id)?.label ?? id ?? null;
}

export function experienceLabel(id: string | null | undefined) {
  const e = EXPERIENCE.find((x) => x.id === id);
  return e ? `${e.label} (${e.desc})` : id ?? null;
}
