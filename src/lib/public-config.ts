/**
 * Konfigurasi publik Supabase (aman berada di browser — data dilindungi RLS).
 * Env var tetap diutamakan; nilai bawaan = project production Markethink,
 * supaya deploy tetap jalan walau env publik belum diisi di Vercel.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cqrstytnbfspbwgyvpzi.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcnN0eXRuYmZzcGJ3Z3l2cHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MzMxODQsImV4cCI6MjEwNzAwOTE4NH0.d8VjsK9Hc02AoWvL8DsDMLsJjI4N1G5ZH7z1M5Mir18";
