"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EXPERIENCE, ROLES } from "@/lib/personas";
import { RESPONSE_STYLES } from "@/lib/ai/prompt-styles";
import { settingsText } from "@/lib/i18n/settings";

const profileSchema = z.object({
  full_name: z.string().trim().max(80),
  persona_role: z.enum(ROLES.map((r) => r.id) as [string, ...string[]]),
  industry: z.string().trim().min(1).max(80),
  experience: z.enum(EXPERIENCE.map((e) => e.id) as [string, ...string[]]),
  goal: z.string().trim().max(200),
});

export async function updateProfile(_prev: { ok?: boolean; error?: string } | undefined, formData: FormData) {
  const { supabase, user, profile } = await requireUser();
  const t = settingsText(profile.language);
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t.errInvalidData };
  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { error: t.errSaveFailed };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addMemory(formData: FormData) {
  const { supabase, user } = await requireUser();
  const content = z.string().trim().min(2).max(300).safeParse(formData.get("content"));
  if (!content.success) return;
  await supabase.from("memories").insert({ user_id: user.id, content: content.data, source: "manual" });
  revalidatePath("/settings");
}

export async function updateMemory(id: string, content: string) {
  const { supabase } = await requireUser();
  const parsed = z.string().trim().min(2).max(300).safeParse(content);
  if (!parsed.success) return;
  await supabase.from("memories").update({ content: parsed.data, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/settings");
}

export async function deleteMemory(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("memories").delete().eq("id", id);
  revalidatePath("/settings");
}

export async function clearMemories() {
  const { supabase, user } = await requireUser();
  await supabase.from("memories").delete().eq("user_id", user.id);
  revalidatePath("/settings");
}

type FormState = { ok?: boolean; error?: string } | undefined;

const personalizationSchema = z.object({
  response_style: z.enum(RESPONSE_STYLES.map((r) => r.id) as [string, ...string[]]),
  custom_instructions: z.string().trim().max(1500),
});

export async function updatePersonalization(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, profile } = await requireUser();
  const t = settingsText(profile.language);
  const parsed = personalizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t.errMax1500 };
  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { error: t.errSaveFailed };
  revalidatePath("/settings");
  return { ok: true };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, profile } = await requireUser();
  const t = settingsText(profile.language);
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: t.errPasswordMin };
  if (password !== formData.get("confirm")) return { error: t.errPasswordMismatch };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/same/i.test(error.message)) return { error: t.errPasswordSame };
    if (/reauth|recent/i.test(error.message)) return { error: t.errPasswordReauth };
    if (/weak|pwned|leaked/i.test(error.message)) return { error: t.errPasswordWeak };
    return { error: t.errPasswordFailed };
  }
  return { ok: true };
}

/** Keluar dari semua perangkat (mencabut semua sesi login). */
export async function signOutEverywhere() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

/** Matikan link publik chat/dokumen. Tanpa id = matikan semua. */
export async function revokeShare(kind: "chat" | "canvas" | "all", id?: string) {
  const { supabase, user } = await requireUser();
  const tables = kind === "all" ? ["chats", "canvases"] : [kind === "chat" ? "chats" : "canvases"];
  for (const t of tables) {
    let q = supabase.from(t).update({ share_token: null }).eq("user_id", user.id).not("share_token", "is", null);
    if (id) q = q.eq("id", id);
    await q;
  }
  revalidatePath("/settings");
}

/** Hapus akun & seluruh data (UU PDP: hak penghapusan). */
export async function deleteAccount(formData: FormData) {
  const { supabase, user } = await requireUser();
  // Kata konfirmasi mengikuti bahasa tampilan (HAPUS / DELETE).
  const word = formData.get("confirm");
  if (word !== settingsText("id").deleteWord && word !== settingsText("en").deleteWord) return;
  const admin = createAdminClient();
  // Hapus semua file di storage milik user.
  const [{ data: att }, { data: wsFiles }] = await Promise.all([
    admin.from("attachments").select("storage_path").eq("user_id", user.id),
    admin.from("workspace_files").select("storage_path").eq("user_id", user.id),
  ]);
  const paths = [...(att ?? []), ...(wsFiles ?? [])].map((f) => f.storage_path as string);
  for (let i = 0; i < paths.length; i += 500) {
    await admin.storage.from("uploads").remove(paths.slice(i, i + 500));
  }
  // usage_logs → user_id di-set null (anonim) via FK; data lain terhapus cascade.
  await admin.auth.admin.deleteUser(user.id);
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
