export const ROLES = [
  { id: "marketing_pro", label: "Marketing profesional", desc: "Brand, digital, atau agency", labelEn: "Marketing professional", descEn: "Brand, digital, or agency" },
  { id: "umkm_owner", label: "Owner UMKM", desc: "Punya usaha & urus marketing sendiri", labelEn: "Small business owner", descEn: "Run a business & handle marketing yourself" },
  { id: "student", label: "Mahasiswa", desc: "Marketing, komunikasi, atau bisnis", labelEn: "Student", descEn: "Marketing, communications, or business" },
  { id: "freelancer", label: "Freelancer", desc: "Social media specialist, copywriter, creator", labelEn: "Freelancer", descEn: "Social media specialist, copywriter, creator" },
  { id: "other", label: "Profesi lain", desc: "Sales, founder, dan lainnya", labelEn: "Other profession", descEn: "Sales, founder, and more" },
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
  { id: "beginner", label: "Pemula", desc: "Baru mulai belajar marketing", labelEn: "Beginner", descEn: "Just starting to learn marketing" },
  { id: "intermediate", label: "Menengah", desc: "1–3 tahun praktik", labelEn: "Intermediate", descEn: "1–3 years of practice" },
  { id: "advanced", label: "Mahir", desc: "3+ tahun / memimpin tim", labelEn: "Advanced", descEn: "3+ years / leading a team" },
] as const;

export const GOALS = [
  "Naikkan penjualan",
  "Bangun brand awareness",
  "Bikin konten rutin",
  "Susun strategi & campaign",
  "Belajar marketing",
  "Melayani klien (agency/freelance)",
];

/** Label tampilan bahasa Inggris untuk INDUSTRIES (nilai tersimpan di DB tetap bahasa Indonesia). */
export const INDUSTRY_LABELS_EN: Record<string, string> = {
  "F&B / Kuliner": "F&B / Culinary",
  "Fashion & Aksesoris": "Fashion & Accessories",
  "Kecantikan & Skincare": "Beauty & Skincare",
  "Kesehatan & Wellness": "Health & Wellness",
  "Teknologi / SaaS / Aplikasi": "Technology / SaaS / Apps",
  Pendidikan: "Education",
  Properti: "Property",
  Otomotif: "Automotive",
  "Keuangan / Fintech": "Finance / Fintech",
  "Travel & Hospitality": "Travel & Hospitality",
  "Retail / E-commerce": "Retail / E-commerce",
  "Jasa Profesional / B2B": "Professional Services / B2B",
  "Kreatif / Media / Hiburan": "Creative / Media / Entertainment",
  Lainnya: "Other",
};

/** Label tampilan bahasa Inggris untuk GOALS (nilai tersimpan di DB tetap bahasa Indonesia). */
export const GOAL_LABELS_EN: Record<string, string> = {
  "Naikkan penjualan": "Increase sales",
  "Bangun brand awareness": "Build brand awareness",
  "Bikin konten rutin": "Create content regularly",
  "Susun strategi & campaign": "Plan strategies & campaigns",
  "Belajar marketing": "Learn marketing",
  "Melayani klien (agency/freelance)": "Serve clients (agency/freelance)",
};

export function roleLabel(id: string | null | undefined) {
  return ROLES.find((r) => r.id === id)?.label ?? id ?? null;
}

export function experienceLabel(id: string | null | undefined) {
  const e = EXPERIENCE.find((x) => x.id === id);
  return e ? `${e.label} (${e.desc})` : id ?? null;
}
