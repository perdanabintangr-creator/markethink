import "server-only";
import { redirect } from "next/navigation";
import { getSession, type Profile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Admin aplikasi otomatis punya akses; selain itu harus terdaftar di backoffice_members. */
export async function hasBackofficeAccess(profile: Profile) {
  if (profile.banned) return false;
  if (profile.role === "admin") return true;
  const { data } = await createAdminClient().from("backoffice_members").select("user_id").eq("user_id", profile.id).maybeSingle();
  return Boolean(data);
}

/** Untuk halaman & aksi back office (/backoffice): wajib login dan punya akses tim back office. */
export async function requireBackoffice() {
  const session = await getSession();
  if (!session.user || !session.profile) redirect("/backoffice/login");
  if (!(await hasBackofficeAccess(session.profile))) redirect("/backoffice/login?denied=1");
  return {
    ...session,
    user: session.user,
    profile: session.profile,
    isAdmin: session.profile.role === "admin",
  };
}
