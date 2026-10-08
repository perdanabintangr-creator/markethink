/** Server-side env helpers. Fitur yang key-nya belum diisi otomatis dinonaktifkan. */
export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  tavilyKey: process.env.TAVILY_API_KEY ?? "",
  geminiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
  resendKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Markethink <onboarding@resend.dev>",
};

export const isSupabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
