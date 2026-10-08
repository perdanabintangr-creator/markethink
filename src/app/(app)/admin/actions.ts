"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setUserBan(userId: string, banned: boolean) {
  const { user } = await requireAdmin();
  if (userId === user.id) return;
  await createAdminClient().from("profiles").update({ banned }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  const { user } = await requireAdmin();
  if (userId === user.id) return;
  await createAdminClient().from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function setCreditOverride(userId: string, formData: FormData) {
  await requireAdmin();
  const raw = String(formData.get("override") ?? "").trim();
  const value = raw === "" ? null : z.coerce.number().int().min(0).max(100000).parse(raw);
  await createAdminClient().from("profiles").update({ daily_credit_override: value }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function grantCredits(userId: string, formData: FormData) {
  await requireAdmin();
  const amount = z.coerce.number().int().min(1).max(10000).safeParse(formData.get("amount"));
  if (!amount.success) return;
  await createAdminClient()
    .from("credit_ledger")
    .insert({ user_id: userId, delta: amount.data, kind: "refund", reason: "admin_grant_today" });
  revalidatePath("/admin/users");
}

export async function updatePlanCredits(planId: string, formData: FormData) {
  await requireAdmin();
  const credits = z.coerce.number().int().min(0).max(100000).safeParse(formData.get("daily_credits"));
  if (!credits.success) return;
  await createAdminClient().from("plans").update({ daily_credits: credits.data }).eq("id", planId);
  revalidatePath("/admin/quota");
}

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
      ctx.addIssue({ code: "custom", message: "input_schema harus JSON array field yang valid" });
      return z.NEVER;
    }
  }),
  default_tier: z.enum(["junior", "senior", "associate"]),
  sort_order: z.coerce.number().int().min(0).max(1000),
  output_canvas: z.literal("on").optional(),
  is_active: z.literal("on").optional(),
});

export async function saveAgent(agentId: string | null, _prev: { error?: string } | undefined, formData: FormData) {
  await requireAdmin();
  const parsed = agentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const d = parsed.data;
  const row = {
    ...d,
    output_canvas: d.output_canvas === "on",
    is_active: d.is_active === "on",
    updated_at: new Date().toISOString(),
  };
  const admin = createAdminClient();
  const { error } = agentId
    ? await admin.from("agents").update(row).eq("id", agentId)
    : await admin.from("agents").insert(row);
  if (error) return { error: error.message.includes("duplicate") ? "Slug sudah dipakai." : "Gagal menyimpan." };
  revalidatePath("/admin/agents");
  revalidatePath("/agents");
  redirect("/admin/agents");
}

export async function toggleAgent(agentId: string, active: boolean) {
  await requireAdmin();
  await createAdminClient().from("agents").update({ is_active: active }).eq("id", agentId);
  revalidatePath("/admin/agents");
  revalidatePath("/agents");
}

export async function setBetaAccess(userId: string, access: boolean) {
  await requireAdmin();
  await createAdminClient().from("profiles").update({ beta_access: access }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function setAccessMode(mode: "invite_only" | "public") {
  await requireAdmin();
  await createAdminClient()
    .from("app_settings")
    .upsert({ key: "access_mode", value: mode, updated_at: new Date().toISOString() });
  revalidatePath("/admin/quota");
}

export async function setUserPlan(userId: string, planId: "beta" | "pro" | "promax") {
  await requireAdmin();
  await createAdminClient().from("profiles").update({ plan_id: planId }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function setWebSearch(enabled: boolean) {
  await requireAdmin();
  await createAdminClient()
    .from("app_settings")
    .upsert({ key: "web_search", value: enabled, updated_at: new Date().toISOString() });
  revalidatePath("/admin/quota");
}

export async function setImageGen(enabled: boolean) {
  await requireAdmin();
  await createAdminClient()
    .from("app_settings")
    .upsert({ key: "image_gen", value: enabled, updated_at: new Date().toISOString() });
  revalidatePath("/admin/quota");
}
