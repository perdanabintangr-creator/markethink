"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  PASSWORD_MIN,
  USERNAME_RE,
  createSession,
  getBackofficeUser,
  hasActiveOwner,
  hashPassword,
  loginBackoffice,
  logoutBackoffice,
  normalizeUsername,
  requireBackoffice,
  revokeSessions,
  verifyPassword,
  verifySetupCode,
} from "@/lib/backoffice";
import { PAYMENT_METHODS } from "@/lib/backoffice-format";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionState = { ok?: string; error?: string } | undefined;

function refresh(userId?: string) {
  revalidatePath("/", "layout");
  if (userId) revalidatePath(`/customers/${userId}`);
}

const usernameSchema = z.string().transform(normalizeUsername).pipe(z.string().regex(USERNAME_RE, "Username 3–32 karakter: huruf kecil, angka, titik, - atau _"));
const passwordSchema = z.string().min(PASSWORD_MIN, `Password minimal ${PASSWORD_MIN} karakter`).max(128);
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Data tidak valid.";

// ---------------------------------------------------------------- Login

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const res = await loginBackoffice(String(formData.get("username") ?? ""), String(formData.get("password") ?? ""));
  if (!res.ok) return { error: res.error };
  redirect("/");
}

export async function logoutAction() {
  await logoutBackoffice();
  redirect("/login");
}

/** Pembuatan akun owner pertama — hanya bila belum ada owner aktif, dan wajib memasukkan kode setup (env BACKOFFICE_SETUP_CODE). */
export async function setupOwner(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (await hasActiveOwner()) return { error: "Akun owner sudah ada. Silakan login." };
  if (!verifySetupCode(String(formData.get("setup_code") ?? ""))) {
    await new Promise((r) => setTimeout(r, 1500)); // perlambat tebak-tebakan
    return { error: "Kode setup salah." };
  }
  const parsed = z
    .object({ full_name: z.string().trim().min(1, "Nama wajib diisi").max(80), username: usernameSchema, password: passwordSchema, password2: z.string() })
    .refine((d) => d.password === d.password2, { message: "Ulangi password tidak sama." })
    .safeParse({
      full_name: formData.get("full_name"),
      username: formData.get("username"),
      password: formData.get("password"),
      password2: formData.get("password2"),
    });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { data, error } = await createAdminClient()
    .from("backoffice_users")
    .insert({ full_name: parsed.data.full_name, username: parsed.data.username, role: "owner", password_hash: await hashPassword(parsed.data.password) })
    .select("id")
    .single();
  if (error || !data) return { error: "Gagal membuat akun. Coba lagi." };
  await createSession(data.id);
  redirect("/");
}

// ---------------------------------------------------------------- Penjualan & paket

const saleSchema = z.object({
  user_id: z.string().uuid().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  plan_id: z.enum(["starter", "pro", "promax"]),
  months: z.coerce.number().int().min(1).max(36),
  amount: z.coerce.number().int().min(0).max(1_000_000_000),
  method: z.enum(PAYMENT_METHODS),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
  if (!userId) return { error: "Isi email pelanggan dulu." };

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
  const plan = z.enum(["beta", "starter", "pro", "promax"]).safeParse(formData.get("plan_id"));
  if (!plan.success) return;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || (plan.data === "beta" ? "Berhenti berlangganan" : "Diubah tim back office");
  await createAdminClient().rpc("bo_set_plan", { p_user: userId, p_plan: plan.data, p_bo_actor: user.id, p_note: note });
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

/** Owner: atur harga paket per bulan (dipakai untuk isi otomatis nominal & estimasi). */
export async function updatePlanPrice(planId: string, formData: FormData) {
  const { isOwner } = await requireBackoffice();
  if (!isOwner) return;
  const price = z.coerce.number().int().min(0).max(100_000_000).safeParse(String(formData.get("price") ?? "").replace(/\D/g, ""));
  if (!price.success) return;
  await createAdminClient().from("plans").update({ monthly_price_idr: price.data }).eq("id", planId);
  refresh();
}

// ---------------------------------------------------------------- Akun tim

export async function createMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, isOwner } = await requireBackoffice();
  if (!isOwner) return { error: "Hanya owner yang bisa menambah akun tim." };
  const parsed = z
    .object({
      full_name: z.string().trim().min(1, "Nama wajib diisi").max(80),
      username: usernameSchema,
      password: passwordSchema,
      role: z.enum(["owner", "staff"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { password, ...member } = parsed.data;
  const { error } = await createAdminClient()
    .from("backoffice_users")
    .insert({ ...member, password_hash: await hashPassword(password), created_by: user.id });
  if (error) return { error: error.code === "23505" ? "Username sudah dipakai." : "Gagal membuat akun. Coba lagi." };
  refresh();
  return { ok: `Akun "${parsed.data.username}" dibuat. Berikan username & password-nya ke anggota tim secara langsung (jangan di grup).` };
}

export async function resetMemberPassword(memberId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { isOwner } = await requireBackoffice();
  if (!isOwner) return { error: "Hanya owner yang bisa reset password." };
  const pw = passwordSchema.safeParse(formData.get("password"));
  if (!pw.success) return { error: firstIssue(pw.error) };
  await createAdminClient()
    .from("backoffice_users")
    .update({ password_hash: await hashPassword(pw.data), failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  await revokeSessions(memberId);
  refresh();
  return { ok: "Password baru tersimpan. Sesi lama akun itu sudah dikeluarkan." };
}

export async function setMemberActive(memberId: string, active: boolean) {
  const { user, isOwner } = await requireBackoffice();
  if (!isOwner || memberId === user.id) return;
  const admin = createAdminClient();
  if (!active) {
    // Jangan sampai tidak ada owner aktif sama sekali.
    const { data: target } = await admin.from("backoffice_users").select("role").eq("id", memberId).maybeSingle();
    if (target?.role === "owner") {
      const { count } = await admin.from("backoffice_users").select("id", { count: "exact", head: true }).eq("role", "owner").eq("active", true);
      if ((count ?? 0) <= 1) return;
    }
  }
  await admin.from("backoffice_users").update({ active, updated_at: new Date().toISOString() }).eq("id", memberId);
  if (!active) await revokeSessions(memberId);
  refresh();
}

export async function changeOwnPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getBackofficeUser();
  if (!me) redirect("/login");
  const parsed = z
    .object({ current: z.string().min(1, "Isi password lama."), password: passwordSchema, password2: z.string() })
    .refine((d) => d.password === d.password2, { message: "Ulangi password baru tidak sama." })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const admin = createAdminClient();
  const { data } = await admin.from("backoffice_users").select("password_hash").eq("id", me.id).single();
  if (!data || !(await verifyPassword(parsed.data.current, data.password_hash))) return { error: "Password lama salah." };
  await admin
    .from("backoffice_users")
    .update({ password_hash: await hashPassword(parsed.data.password), updated_at: new Date().toISOString() })
    .eq("id", me.id);
  await revokeSessions(me.id, true);
  return { ok: "Password berhasil diganti. Perangkat lain yang login dengan akun ini sudah dikeluarkan." };
}

// ---------------------------------------------------------------- Pengaturan aplikasi AI (owner)

async function requireOwner() {
  const session = await requireBackoffice();
  if (!session.isOwner) throw new Error("Hanya owner.");
  return session;
}

export async function setAppSetting(key: "access_mode" | "web_search" | "image_gen", value: string | boolean) {
  await requireOwner();
  if (key === "access_mode" && value !== "public" && value !== "invite_only") return;
  if (key !== "access_mode" && typeof value !== "boolean") return;
  await createAdminClient().from("app_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  revalidatePath("/settings");
}

export async function updatePlanCredits(planId: string, formData: FormData) {
  await requireOwner();
  const credits = z.coerce.number().int().min(0).max(1_000_000).safeParse(formData.get("monthly_credits"));
  if (!credits.success) return;
  await createAdminClient().from("plans").update({ monthly_credits: credits.data }).eq("id", planId);
  revalidatePath("/settings");
}

/** Kuota penyimpanan total & batas ukuran per file untuk satu paket (feature_flags storage/uploads). */
export async function updatePlanStorage(planId: string, formData: FormData) {
  await requireOwner();
  const total = z.coerce.number().int().min(1).max(1_000_000).safeParse(formData.get("storage_mb"));
  const perFile = z.coerce.number().int().min(1).max(25).safeParse(formData.get("file_mb"));
  if (!total.success || !perFile.success) return;
  await createAdminClient()
    .from("feature_flags")
    .upsert(
      [
        { plan_id: planId, key: "storage", enabled: true, value: { max_mb: total.data } },
        { plan_id: planId, key: "uploads", enabled: true, value: { max_mb: perFile.data } },
      ],
      { onConflict: "plan_id,key" },
    );
  revalidatePath("/settings");
}

// ---------------------------------------------------------------- Kontrol akun pelanggan (owner)

export async function setUserBan(userId: string, banned: boolean) {
  await requireOwner();
  await createAdminClient().from("profiles").update({ banned }).eq("id", userId);
  refresh(userId);
}

export async function setBetaAccess(userId: string, access: boolean) {
  await requireOwner();
  await createAdminClient().from("profiles").update({ beta_access: access }).eq("id", userId);
  refresh(userId);
}

export async function setCreditOverride(userId: string, formData: FormData) {
  await requireOwner();
  const raw = String(formData.get("override") ?? "").trim();
  const value = raw === "" ? null : z.coerce.number().int().min(0).max(1_000_000).safeParse(raw);
  if (value && !value.success) return;
  await createAdminClient()
    .from("profiles")
    .update({ monthly_credit_override: value ? value.data : null })
    .eq("id", userId);
  refresh(userId);
}

/**
 * Buat link reset password untuk pelanggan (owner) — dikirim tim lewat WhatsApp/email bila pelanggan tidak menerima email.
 * Password pelanggan sendiri TIDAK pernah bisa dilihat (tersimpan teracak/hash).
 */
export async function createResetLink(userId: string): Promise<{ link?: string; error?: string }> {
  await requireOwner();
  const admin = createAdminClient();
  const { data: u, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr || !u.user?.email) return { error: "Akun tidak ditemukan." };
  const appUrl = (process.env.MARKETHINK_APP_URL || "https://markethink-pi.vercel.app").replace(/\/$/, "");
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: u.user.email,
    options: { redirectTo: `${appUrl}/auth/callback?next=/reset-password` },
  });
  if (error || !data.properties?.action_link) return { error: "Gagal membuat link. Coba lagi." };
  return { link: data.properties.action_link };
}

export async function grantCredits(userId: string, formData: FormData) {
  await requireOwner();
  const amount = z.coerce.number().int().min(1).max(100000).safeParse(formData.get("amount"));
  if (!amount.success) return;
  await createAdminClient()
    .from("credit_ledger")
    .insert({ user_id: userId, delta: amount.data, kind: "refund", reason: "admin_grant" });
  refresh(userId);
}

// ---------------------------------------------------------------- Marketing Agents (owner)

const fieldSchema = z.object({
  name: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "select"]),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const agentSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, "Slug hanya huruf kecil, angka, dan tanda -"),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300),
  icon: z.string().trim().max(40),
  category: z.string().trim().min(1).max(40),
  instructions: z.string().trim().min(20).max(10000),
  input_schema: z.string().transform((s, ctx) => {
    try {
      return z.array(fieldSchema).max(20).parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "Form input harus JSON array field yang valid" });
      return z.NEVER;
    }
  }),
  default_tier: z.enum(["junior", "senior", "associate"]),
  sort_order: z.coerce.number().int().min(0).max(1000),
  output_canvas: z.literal("on").optional(),
  is_active: z.literal("on").optional(),
});

export async function saveAgent(agentId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOwner();
  const parsed = agentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const d = parsed.data;
  const row = { ...d, output_canvas: d.output_canvas === "on", is_active: d.is_active === "on", updated_at: new Date().toISOString() };
  const admin = createAdminClient();
  const { error } = agentId ? await admin.from("agents").update(row).eq("id", agentId) : await admin.from("agents").insert(row);
  if (error) return { error: error.message.includes("duplicate") ? "Slug sudah dipakai." : "Gagal menyimpan." };
  revalidatePath("/agents");
  redirect("/agents");
}

export async function toggleAgent(agentId: string, active: boolean) {
  await requireOwner();
  await createAdminClient().from("agents").update({ is_active: active }).eq("id", agentId);
  revalidatePath("/agents");
}

// ---------------------------------------------------------------- Add-on (Tools Pro)

const ADDON_IDS = ["strategi_pro", "riset_pro", "konten_pro", "dokter_iklan", "jualan_kit", "crm_pro", "kolpr_pro", "laporan_pro"] as const;

const addonSaleSchema = z.object({
  user_id: z.string().uuid(),
  addon_id: z.enum(ADDON_IDS),
  months: z.coerce.number().int().min(1).max(36),
  amount: z.coerce.number().int().min(0).max(1_000_000_000),
  method: z.enum(PAYMENT_METHODS),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(500).optional(),
});

/** Catat pembelian add-on → langsung aktif (perpanjangan menyambung dari periode aktif). */
export async function recordAddonSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireBackoffice();
  const parsed = addonSaleSchema.safeParse(Object.fromEntries([...formData].filter(([, v]) => v !== "")));
  if (!parsed.success) return { error: "Data add-on belum lengkap / tidak valid." };
  const d = parsed.data;
  const { error } = await createAdminClient().rpc("bo_record_addon_sale", {
    p_user: d.user_id,
    p_addon: d.addon_id,
    p_months: d.months,
    p_amount: d.amount,
    p_method: d.method,
    p_note: d.note ?? null,
    p_actor: user.id,
    p_paid_at: d.paid_at ? new Date(`${d.paid_at}T12:00:00+07:00`).toISOString() : null,
  });
  if (error) return { error: "Gagal menyimpan add-on. Coba lagi." };
  refresh(d.user_id);
  return { ok: "Add-on aktif & penjualan tercatat." };
}

/** Batalkan pembelian add-on (salah catat/refund): tidak dihitung pendapatan & periodenya ditutup. */
export async function refundAddonSale(saleId: string, userId: string) {
  await requireBackoffice();
  const admin = createAdminClient();
  const { data: sale } = await admin.from("addon_subscriptions").select("period_start, period_end").eq("id", saleId).maybeSingle();
  if (!sale) return;
  const t = Date.now();
  const end = new Date(sale.period_end).getTime() > t ? new Date(Math.max(new Date(sale.period_start).getTime(), t)).toISOString() : sale.period_end;
  await admin.from("addon_subscriptions").update({ refunded_at: new Date().toISOString(), period_end: end }).eq("id", saleId).is("refunded_at", null);
  refresh(userId);
}

/** Owner: ubah harga & kuota add-on. */
export async function updateAddon(addonId: string, formData: FormData) {
  const { isOwner } = await requireBackoffice();
  if (!isOwner || !(ADDON_IDS as readonly string[]).includes(addonId)) return;
  const int = (k: string, max: number) => z.coerce.number().int().min(0).max(max).safeParse(String(formData.get(k) ?? "").replace(/\D/g, ""));
  const price = int("price", 100_000_000);
  const quota = int("monthly_quota", 1000);
  const promax = int("promax_quota", 1000);
  const trial = int("trial_quota", 100);
  if (!price.success || !quota.success || !promax.success || !trial.success) return;
  await createAdminClient()
    .from("addons")
    .update({
      price_idr: price.data,
      monthly_quota: quota.data,
      promax_quota: promax.data,
      trial_quota: trial.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", addonId);
  refresh();
}
