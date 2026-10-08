"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRAND_KIT_FIELDS } from "@/lib/ai/prompt";
import { createProject } from "@/lib/projects";

export async function createWorkspace(formData: FormData) {
  const { supabase, profile } = await requireUser();
  const result = await createProject(supabase, profile, formData.get("name"));
  if ("error" in result) return;
  revalidatePath("/", "layout");
  redirect(`/workspaces/${result.id}`);
}

export async function saveBrandKit(workspaceId: string, _prev: { ok?: boolean; error?: string } | undefined, formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Nama workspace wajib diisi." };
  const kit: Record<string, string> = {};
  for (const f of BRAND_KIT_FIELDS) {
    if (f.key === "brand_name") continue;
    const v = String(formData.get(f.key) ?? "").trim().slice(0, 2000);
    if (v) kit[f.key] = v;
  }
  const { error } = await supabase
    .from("workspaces")
    .update({ name, brand_kit: kit, updated_at: new Date().toISOString() })
    .eq("id", workspaceId);
  if (error) return { error: "Gagal menyimpan." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteWorkspace(workspaceId: string) {
  const { supabase, user } = await requireUser();
  const { data: files } = await supabase.from("workspace_files").select("storage_path").eq("workspace_id", workspaceId);
  if (files?.length) {
    await createAdminClient()
      .storage.from("uploads")
      .remove(files.map((f) => f.storage_path as string).filter((p) => p.startsWith(`${user.id}/`)));
  }
  await supabase.from("workspaces").delete().eq("id", workspaceId);
  revalidatePath("/", "layout");
  redirect("/workspaces");
}

export async function deleteWorkspaceFile(fileId: string) {
  const { supabase, user } = await requireUser();
  const { data: file } = await supabase.from("workspace_files").select("storage_path, workspace_id").eq("id", fileId).maybeSingle();
  if (!file) return;
  if ((file.storage_path as string).startsWith(`${user.id}/`)) {
    await createAdminClient().storage.from("uploads").remove([file.storage_path as string]);
  }
  await supabase.from("workspace_files").delete().eq("id", fileId);
  revalidatePath(`/workspaces/${file.workspace_id}`);
}
