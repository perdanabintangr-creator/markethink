/** Server-side env helpers. Fitur yang key-nya belum diisi otomatis dinonaktifkan. */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/public-config";

/** URL publik app: env eksplisit → domain production Vercel (otomatis) → localhost. */
export function resolveAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export const env = {
  appUrl: resolveAppUrl(),
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  adminEmails: (process.env.ADMIN_EMAILS || "perdanabintangr@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  tavilyKey: process.env.TAVILY_API_KEY ?? "",
  geminiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
  resendKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Markethink <onboarding@resend.dev>",
};

export const isSupabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
