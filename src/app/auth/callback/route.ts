import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAdminRole } from "@/lib/auth";
import { emails, sendEmail } from "@/lib/email";

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/chat";
}

async function afterLogin(userId: string, email: string | undefined) {
  try {
    await afterLoginTasks(userId, email);
  } catch (err) {
    console.error("[auth] tugas setelah login gagal", err);
  }
}

async function afterLoginTasks(userId: string, email: string | undefined) {
  await syncAdminRole(userId, email);
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, created_at, onboarded")
    .eq("id", userId)
    .single();
  const isNew = profile && !profile.onboarded && Date.now() - new Date(profile.created_at).getTime() < 10 * 60 * 1000;
  if (isNew && email) await sendEmail(email, "Selamat datang di Markethink 👋", emails.welcome(profile.full_name ?? ""));
  await admin.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", userId);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await afterLogin(data.user.id, data.user.email);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}

/** Dipanggil setelah login password untuk sinkron role admin. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await afterLogin(user.id, user.email);
  return NextResponse.json({ ok: true });
}
