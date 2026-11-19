"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBackoffice } from "@/lib/backoffice";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_IDS, PROMO_THEMES } from "@/lib/promos";

export type PromoActionState = { ok?: string; error?: string } | undefined;

async function requireOwner() {
  const session = await requireBackoffice();
  if (!session.isOwner) throw new Error("Hanya owner.");
  return session;
}

const MAX_IMAGE = 2 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

const schema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi.").max(80, "Judul maksimal 80 karakter."),
  subtitle: z.string().trim().max(160, "Deskripsi maksimal 160 karakter.").optional(),
  eyebrow: z.string().trim().max(30, "Label kecil maksimal 30 karakter.").optional(),
  cta_label: z.string().trim().min(1, "Teks tombol wajib diisi.").max(30, "Teks tombol maksimal 30 karakter."),
  link_url: z
    .string()
    .trim()
    .regex(/^(\/[^\s]*|https:\/\/[^\s]+)$/, "Link harus diawali / (halaman Marqthink) atau https:// (situs lain)."),
  theme: z.enum(PROMO_THEMES),
  brand: z.string().trim().max(60).optional(),
  sponsored: z.boolean(),
  plans: z.array(z.enum(PLAN_IDS)),
  starts_at: z.string().trim().optional(),
  ends_at: z.string().trim().optional(),
  sort_order: z.coerce.number().int().min(-1000).max(1000),
  active: z.boolean(),
});

/** Tanggal dari input datetime-local (WIB) → ISO, atau null. */
function wibToIso(v?: string) {
  if (!v) return null;
  const d = new Date(`${v}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function savePromo(id: string | null, _prev: PromoActionState, formData: FormData): Promise<PromoActionState> {
  await requireOwner();
  const parsed = schema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle") || undefined,
    eyebrow: formData.get("eyebrow") || undefined,
    cta_label: formData.get("cta_label"),
    link_url: formData.get("link_url"),
    theme: formData.get("theme"),
    brand: formData.get("brand") || undefined,
    sponsored: formData.get("sponsored") === "on",
    plans: formData.getAll("plans").map(String),
    starts_at: formData.get("starts_at") || undefined,
    ends_at: formData.get("ends_at") || undefined,
    sort_order: formData.get("sort_order") ?? 0,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data belum lengkap." };
  const d = parsed.data;
  if (!d.plans.length) return { error: "Pilih minimal satu paket yang melihat promosi ini." };
  if (d.sponsored && !d.brand) return { error: "Isi nama brand sponsor (tampil di kartu promosi)." };
  const startsAt = wibToIso(d.starts_at);
  const endsAt = wibToIso(d.ends_at);
  if (startsAt && endsAt && endsAt <= startsAt) return { error: "Tanggal selesai harus setelah tanggal mulai." };

  const admin = createAdminClient();
  let imageUrl: string | null | undefined;
  if (formData.get("remove_image") === "on") imageUrl = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext) return { error: "Gambar harus PNG, JPG, atau WEBP." };
    if (file.size > MAX_IMAGE) return { error: "Ukuran gambar maksimal 2 MB." };
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage.from("promos").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { error: "Gagal mengunggah gambar. Coba lagi." };
    imageUrl = admin.storage.from("promos").getPublicUrl(path).data.publicUrl;
  }

  const row = {
    title: d.title,
    subtitle: d.subtitle || null,
    eyebrow: d.eyebrow || null,
    cta_label: d.cta_label,
    link_url: d.link_url,
    theme: d.theme,
    brand: d.brand || null,
    sponsored: d.sponsored,
    // Semua paket dicentang → null (= semua, termasuk paket baru nanti).
    plans: d.plans.length === PLAN_IDS.length ? null : d.plans,
    starts_at: startsAt,
    ends_at: endsAt,
    sort_order: d.sort_order,
    active: d.active,
    updated_at: new Date().toISOString(),
    ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
  };
  const { error } = id ? await admin.from("promos").update(row).eq("id", id) : await admin.from("promos").insert(row);
  if (error) return { error: "Gagal menyimpan promosi. Periksa isian lalu coba lagi." };
  revalidatePath("/promos");
  redirect("/promos?saved=1");
}

export async function togglePromo(id: string, active: boolean) {
  await requireOwner();
  await createAdminClient().from("promos").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/promos");
}

export async function deletePromo(id: string) {
  await requireOwner();
  await createAdminClient().from("promos").delete().eq("id", id);
  revalidatePath("/promos");
}
