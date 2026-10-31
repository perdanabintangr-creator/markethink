import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { emails, sendEmail } from "@/lib/email";

const body = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

/**
 * Lupa password. Link dibuat tanpa PKCE (token ikut di link), jadi bisa dibuka di HP/browser mana pun —
 * sebelumnya link hanya jalan di browser yang sama dengan tempat meminta reset.
 * Resend terpasang → email dikirim sendiri (tanpa batas kirim email bawaan Supabase); selain itu lewat email Supabase.
 * Jawaban selalu "terkirim" agar orang lain tidak bisa mengecek email mana yang terdaftar.
 */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_email", message: "Format email belum benar." }, { status: 400 });
  const { email } = parsed.data;
  const origin = new URL(req.url).origin;
  const redirectTo = `${origin}/auth/callback?next=/reset-password`;

  if (env.resendKey && env.supabaseServiceKey) {
    const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    if (!error && data.properties?.action_link) {
      const sent = await sendEmail(email, "Reset password Marqthink", emails.resetPassword(data.properties.action_link));
      if (!sent.skipped) return NextResponse.json({ ok: true });
    } else if (error && !/not.?found/i.test(error.message)) {
      console.error("[forgot] generateLink gagal", error.message);
    } else {
      return NextResponse.json({ ok: true });
    }
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    const wait = error.message.match(/after (\d+) seconds/)?.[1];
    if (error.status === 429 || /rate limit/i.test(error.message)) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: wait ? `Tunggu ${wait} detik, lalu coba kirim lagi.` : "Terlalu banyak permintaan reset. Coba lagi beberapa menit lagi.",
        },
        { status: 429 },
      );
    }
    console.error("[forgot] resetPasswordForEmail gagal", error.message);
  }
  return NextResponse.json({ ok: true });
}
