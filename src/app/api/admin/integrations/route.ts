import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { serperEnabled, serperSearch } from "@/lib/ai/research";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const has = (name: string) => Boolean(process.env[name]?.trim());

/**
 * Cek integrasi (khusus admin): kunci mana yang terpasang (ya/tidak — isi kunci TIDAK ditampilkan)
 * + uji 1 pencarian Serper (±Rp16) untuk memastikan kuncinya benar-benar jalan.
 * `?email=1` → kirim 1 email uji (Resend) ke email admin sendiri.
 */
export async function GET(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (s.profile.role !== "admin") return jsonError(403, "forbidden");

  let serperTest: { ok: boolean; hasil?: number; contoh?: string; error?: string } | null = null;
  if (serperEnabled()) {
    try {
      const res = await serperSearch("harga photobox jakarta", { maxResults: 3 });
      serperTest = { ok: res.length > 0, hasil: res.length, contoh: res[0]?.title };
    } catch (err) {
      serperTest = { ok: false, error: (err instanceof Error ? err.message : String(err)).slice(0, 200) };
    }
  }

  let emailTest: { ok: boolean; ke?: string; error?: string } | string = "tambahkan ?email=1 di alamat untuk kirim email uji ke email kamu";
  if (new URL(req.url).searchParams.get("email") === "1") {
    if (!env.resendKey) emailTest = { ok: false, error: "RESEND_API_KEY belum terpasang (atau belum Redeploy)" };
    else if (!s.user.email) emailTest = { ok: false, error: "akun admin tidak punya email" };
    else {
      const res = await sendEmail(s.user.email, "Tes email Marqthink ✅", "<p>Email dari Marqthink sudah bisa terkirim lewat Resend.</p>");
      emailTest = res.skipped ? { ok: false, error: "Resend menolak, cek log Vercel ([email] gagal kirim)" } : { ok: true, ke: s.user.email };
    }
  }

  return NextResponse.json({
    terpasang: {
      anthropic_claude: has("ANTHROPIC_API_KEY"),
      google_gemini: has("GOOGLE_GENERATIVE_AI_API_KEY"),
      openrouter_gambar: has("OPENROUTER_API_KEY"),
      imagen: has("IMAGEN_API_KEY"),
      serper_riset_web: has("SERPER_API_KEY"),
      tavily_riset_web: has("TAVILY_API_KEY"),
      groq: has("GROQ_API_KEY"),
      resend_email: has("RESEND_API_KEY"),
      cron_secret_pantau_mingguan: has("CRON_SECRET"),
      email_pengirim_khusus: has("EMAIL_FROM"),
      mayar: has("MAYAR_API_KEY"),
      mayar_mode_live: process.env.MAYAR_IS_PRODUCTION === "true",
      mayar_webhook_token: has("MAYAR_WEBHOOK_TOKEN"),
      duitku: has("DUITKU_MERCHANT_CODE") && has("DUITKU_API_KEY"),
      midtrans: has("MIDTRANS_SERVER_KEY"),
    },
    email_pengirim: env.emailFrom,
    uji_email: emailTest,
    uji_serper: serperTest ?? "SERPER_API_KEY belum terpasang di Vercel (atau belum Redeploy setelah diisi).",
    versi_deploy: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev",
  });
}
