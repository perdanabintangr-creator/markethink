import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  plan_id: string;
  language: "id" | "en";
  persona_role: string | null;
  industry: string | null;
  experience: string | null;
  goal: string | null;
  onboarded: boolean;
  consent_at: string | null;
  banned: boolean;
  daily_credit_override: number | null;
  created_at: string;
}

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return { supabase, user, profile };
});

/** Untuk halaman app: wajib login, tidak di-ban, sudah onboarding. */
export async function requireUser(opts: { allowNotOnboarded?: boolean } = {}) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  if (!session.profile) redirect("/login?error=profile");
  if (session.profile.banned) redirect("/banned");
  if (!opts.allowNotOnboarded && !session.profile.onboarded) redirect("/onboarding");
  return session as typeof session & { user: NonNullable<typeof session.user>; profile: Profile };
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.profile.role !== "admin") redirect("/chat");
  return session;
}

/** Promosikan email di ADMIN_EMAILS menjadi admin (dipanggil setelah login). */
export async function syncAdminRole(userId: string, email: string | undefined | null) {
  if (!email || !env.adminEmails.includes(email.toLowerCase())) return;
  const admin = createAdminClient();
  await admin.from("profiles").update({ role: "admin" }).eq("id", userId).neq("role", "admin");
}
