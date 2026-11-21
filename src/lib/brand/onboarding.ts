import { z } from "zod";

/**
 * Brand Onboarding (ACC founder 21 Nov): field wajib & opsional di atas Brand Kit, hitung kelengkapan, dan gate
 * Autopilot (terkunci sampai field wajib lengkap + Brand DNA di-ACC). Modul murni (diuji vitest).
 */

export const CONTENT_GOALS = ["awareness", "jualan", "booking", "komunitas"] as const;
export const CTA_TYPES = ["whatsapp", "link_booking", "dm", "datang"] as const;
export const ASSET_KINDS = ["logo", "real_photo", "feed_screenshot", "competitor_screenshot", "reference_screenshot"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

/** Minimum foto asli produk/tempat/layanan. */
export const MIN_REAL_PHOTOS = 3;
export const MAX_REAL_PHOTOS = 10;
export const MAX_SCREENSHOTS = 6;

/** Field teks onboarding (disimpan di workspaces.brand_kit). */
export const onboardingFields = z.object({
  // Wajib
  category: z.string().trim().max(80).optional(),
  instagram: z.string().trim().max(120).optional(),
  target_audience: z.string().trim().max(600).optional(),
  content_goal: z.enum(CONTENT_GOALS).optional().nullable(),
  location: z.string().trim().max(200).optional(),
  cta_primary: z.enum(CTA_TYPES).optional().nullable(),
  cta_link: z.string().trim().max(300).optional(),
  // Opsional
  website: z.string().trim().max(300).optional(),
  maps: z.string().trim().max(400).optional(),
  tiktok: z.string().trim().max(120).optional(),
  color_primary: z.string().trim().max(9).optional(),
  color_secondary: z.string().trim().max(9).optional(),
  fonts: z.string().trim().max(200).optional(),
  products: z.string().trim().max(2000).optional(),
  promos: z.string().trim().max(600).optional(),
  usp: z.string().trim().max(600).optional(),
  competitor_accounts: z.string().trim().max(300).optional(),
  reference_accounts: z.string().trim().max(300).optional(),
  caption_examples: z.string().trim().max(2000).optional(),
  brand_voice: z.string().trim().max(600).optional(),
  voice_dont: z.string().trim().max(600).optional(),
  visual_dont: z.string().trim().max(600).optional(),
  sensitive: z.string().trim().max(600).optional(),
  talent_pref: z.string().trim().max(400).optional(),
});
export type OnboardingFields = z.infer<typeof onboardingFields>;

export interface OnboardingState {
  name: string;
  kit: Record<string, unknown>;
  assets: { kind: AssetKind }[];
}

const filled = (v: unknown) => (typeof v === "string" ? v.trim().length > 0 : v !== null && v !== undefined);

/** Field wajib: kunci, label, dan cek terisi. */
export const REQUIRED: {
  key: string;
  label: string;
  ok: (s: OnboardingState) => boolean;
}[] = [
  { key: "name", label: "Nama brand", ok: (s) => s.name.trim().length > 0 },
  {
    key: "category",
    label: "Kategori / industri",
    ok: (s) => filled(s.kit.category),
  },
  {
    key: "instagram",
    label: "Link Instagram",
    ok: (s) => filled(s.kit.instagram) || filled(s.kit.social_handle),
  },
  {
    key: "logo",
    label: "Logo",
    ok: (s) => s.assets.some((a) => a.kind === "logo") || filled(s.kit.logo_id),
  },
  {
    key: "real_photos",
    label: `${MIN_REAL_PHOTOS}–${MAX_REAL_PHOTOS} foto asli`,
    ok: (s) => s.assets.filter((a) => a.kind === "real_photo").length >= MIN_REAL_PHOTOS,
  },
  {
    key: "target_audience",
    label: "Target audiens",
    ok: (s) => filled(s.kit.target_audience),
  },
  {
    key: "content_goal",
    label: "Tujuan konten",
    ok: (s) => filled(s.kit.content_goal),
  },
  {
    key: "location",
    label: "Lokasi / area layanan",
    ok: (s) => filled(s.kit.location),
  },
  {
    key: "cta_primary",
    label: "CTA utama",
    ok: (s) => filled(s.kit.cta_primary),
  },
];

export const OPTIONAL_KEYS = [
  "website",
  "maps",
  "tiktok",
  "color_primary",
  "fonts",
  "products",
  "promos",
  "usp",
  "competitor_accounts",
  "reference_accounts",
  "caption_examples",
  "brand_voice",
  "voice_dont",
  "visual_dont",
  "sensitive",
  "talent_pref",
] as const;

/** Kelengkapan brand 0–100: wajib bernilai 70%, opsional (+ screenshot feed/kompetitor) 30%. */
export function completeness(s: OnboardingState) {
  const req = REQUIRED.filter((r) => r.ok(s)).length / REQUIRED.length;
  const shots = s.assets.some((a) => a.kind !== "logo" && a.kind !== "real_photo") ? 1 : 0;
  const opt = (OPTIONAL_KEYS.filter((k) => filled(s.kit[k])).length + shots) / (OPTIONAL_KEYS.length + 1);
  const missing = REQUIRED.filter((r) => !r.ok(s)).map((r) => ({
    key: r.key,
    label: r.label,
  }));
  return {
    percent: Math.round(req * 70 + opt * 30),
    requiredDone: missing.length === 0,
    missing,
  };
}

export type GateReason = "no_brand" | "onboarding" | "dna_not_approved" | null;

/** Gate Autopilot: brand dipilih → field wajib lengkap → Brand DNA versi aktif sudah di-ACC. */
export function autopilotGate(o: { workspaceId: string | null; requiredDone: boolean; approvedVersion: number | null }): GateReason {
  if (!o.workspaceId) return "no_brand";
  if (!o.requiredDone) return "onboarding";
  if (!o.approvedVersion) return "dna_not_approved";
  return null;
}

/** Nomor versi DNA berikutnya. */
export const nextVersion = (versions: number[]) => (versions.length ? Math.max(...versions) + 1 : 1);

/** Brand Kit berubah sejak DNA dibuat? (field yang memengaruhi DNA) → tawarkan "Perbarui Brand DNA". */
export function kitChanged(snapshot: Record<string, unknown> | null | undefined, kit: Record<string, unknown>) {
  if (!snapshot) return false;
  const keys = [
    "category",
    "target_audience",
    "content_goal",
    "location",
    "cta_primary",
    "products",
    "promos",
    "usp",
    "brand_voice",
    "voice_dont",
    "visual_dont",
    "sensitive",
    "talent_pref",
    "color_primary",
    "color_secondary",
    "logo_id",
    "_assets",
  ];
  return keys.some((k) => String(snapshot[k] ?? "") !== String(kit[k] ?? ""));
}

/** Bersihkan & gabungkan isian form ke Brand Kit (field kosong dihapus; warna dinormalkan). */
export function mergeOnboarding(kit: Record<string, unknown>, f: OnboardingFields) {
  const out: Record<string, unknown> = { ...kit };
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined) continue;
    if (v === null || (typeof v === "string" && !v.trim())) delete out[k];
    else out[k] = typeof v === "string" ? v.trim() : v;
  }
  for (const k of ["color_primary", "color_secondary"]) {
    const v = String(out[k] ?? "");
    if (v && /^#?[0-9a-fA-F]{6}$/.test(v)) out[k] = `#${v.replace("#", "").toUpperCase()}`;
    else if (v) delete out[k];
  }
  // Akun IG juga dipakai sebagai handle desain (@akun).
  if (typeof out.instagram === "string" && out.instagram) {
    const h = out.instagram
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/[/?#].*$/, "")
      .replace(/^@/, "");
    if (h) out.social_handle = `@${h}`;
  }
  return out;
}
