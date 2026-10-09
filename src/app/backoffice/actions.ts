"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBackoffice } from "@/lib/backoffice";
import { PAYMENT_METHODS } from "@/lib/backoffice-format";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionState = { ok?: string; error?: string } | undefined;

function refresh(userId?: string) {
  revalidatePath("/backoffice", "layout");
  if (userId) revalidatePath(`/backoffice/customers/${userId}`);
}

const saleSchema = z.object({
  user_id: z.string().uuid().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  plan_id: z.enum(["pro", "promax"]),
  months: z.coerce.number().int().min(1).max(36),
  amount: z.coerce.number().int().min(0).max(1_000_000_000),
  method: z.enum(PAYMENT_METHODS),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional(),
});

/** Catat penjualan (bayar manual: transfer/QRIS/dll). Otomatis mengaktifkan paket user. */
export async function recordSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireBackoffice();
  const parsed = saleSchema.safeParse(Object.fromEntries([...formData].filter(([, v]) => v !== "")));
  if (!parsed.success) return { error: "Data belum lengkap / tidak valid. Cek email, paket, durasi, dan nominal." };
  const d = parsed.data;
  const admin = createAdminClient();

  let userId = d.user_id;
  if (!userId && d.email) {
    const { data } = await admin.from("profiles").select("id").ilike("email", d.email).maybeSingle();
    if (!data) return { error: `Akun ${d.email} belum terdaftar di Markethink. Minta pelanggan daftar dulu.` };
    userId = data.id;
  }
  if (!userId) return { error: "Pilih pelanggan dulu." };

  // Tanggal bayar diisi = jam 12 siang WIB di hari itu (aman dari geser zona waktu).
  const paidAt = d.paid_at ? new Date(`${d.paid_at}T12:00:00+07:00`).toISOString() : null;
  const { error } = await admin.rpc("bo_record_sale", {
    p_user: userId,
    p_plan: d.plan_id,
    p_months: d.months,
    p_amount: d.amount,
    p_method: d.method,
    p_note: d.note ?? null,
    p_actor: user.id,
    p_paid_at: paidAt,
  });
  if (error) return { error: "Gagal menyimpan penjualan. Coba lagi." };
  refresh(userId);
  return { ok: "Penjualan tercatat & paket pelanggan sudah aktif." };
}

/** Ubah paket tanpa pembayaran (mis. bonus, kompensasi) atau hentikan langganan (ke Free). */
export async function changePlan(userId: string, formData: FormData) {
  const { user } = await requireBackoffice();
  const plan = z.enum(["beta", "pro", "promax"]).safeParse(formData.get("plan_id"));
  if (!plan.success) return;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || (plan.data === "beta" ? "Berhenti berlangganan" : "Diubah tim back office");
  await createAdminClient().rpc("bo_change_plan", { p_user: userId, p_plan: plan.data, p_actor: user.id, p_note: note });
  refresh(userId);
}

/** Tandai penjualan sebagai batal/refund: tidak dihitung pendapatan & periodenya ditutup. */
export async function refundSale(saleId: string, userId: string) {
  await requireBackoffice();
  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { data: sale } = await admin.from("subscriptions").select("current_period_start, current_period_end").eq("id", saleId).maybeSingle();
  if (!sale) return;
  // Periode yang masih berjalan/antre ditutup sekarang (atau di awal periodenya bila belum mulai).
  const t = Date.now();
  const startMs = new Date(sale.current_period_start).getTime();
  const endMs = new Date(sale.current_period_end).getTime();
  const end = endMs > t ? new Date(Math.max(startMs, t)).toISOString() : sale.current_period_end;
  await admin
    .from("subscriptions")
    .update({ refunded_at: now, status: "canceled", current_period_end: end, updated_at: now })
    .eq("id", saleId)
    .is("refunded_at", null);
  refresh(userId);
}

/** Admin: atur harga paket per bulan (dipakai untuk isi otomatis nominal & estimasi). */
export async function updatePlanPrice(planId: string, formData: FormData) {
  const { isAdmin } = await requireBackoffice();
  if (!isAdmin) return;
  const price = z.coerce.number().int().min(0).max(100_000_000).safeParse(formData.get("price"));
  if (!price.success) return;
  await createAdminClient().from("plans").update({ monthly_price_idr: price.data }).eq("id", planId);
  refresh();
}

/** Admin: beri akses back office ke akun yang sudah terdaftar. */
export async function addMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, isAdmin } = await requireBackoffice();
  if (!isAdmin) return { error: "Hanya admin yang bisa menambah anggota tim." };
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Email tidak valid." };
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("id, role").ilike("email", email.data).maybeSingle();
  if (!p) return { error: "Email ini belum punya akun Markethink. Minta orangnya daftar dulu di halaman daftar, lalu tambahkan lagi." };
  if (p.role === "admin") return { ok: "Akun ini admin — sudah otomatis punya akses." };
  const { error } = await admin.from("backoffice_members").upsert({ user_id: p.id, added_by: user.id });
  if (error) return { error: "Gagal menambahkan. Coba lagi." };
  refresh();
  return { ok: `${email.data} sekarang bisa membuka back office.` };
}

export async function removeMember(userId: string) {
  const { isAdmin } = await requireBackoffice();
  if (!isAdmin) return;
  await createAdminClient().from("backoffice_members").delete().eq("user_id", userId);
  refresh();
}
