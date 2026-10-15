import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { serperEnabled, serperSearch } from "@/lib/ai/research";

export const dynamic = "force-dynamic";

const has = (name: string) => Boolean(process.env[name]?.trim());

/**
 * Cek integrasi (khusus admin): kunci mana yang terpasang (ya/tidak — isi kunci TIDAK ditampilkan)
 * + uji 1 pencarian Serper (±Rp16) untuk memastikan kuncinya benar-benar jalan.
 */
export async function GET() {
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

  return NextResponse.json({
    terpasang: {
      anthropic_claude: has("ANTHROPIC_API_KEY"),
      google_gemini: has("GOOGLE_GENERATIVE_AI_API_KEY"),
      openrouter_gambar: has("OPENROUTER_API_KEY"),
      imagen: has("IMAGEN_API_KEY"),
      serper_riset_web: has("SERPER_API_KEY"),
      tavily_riset_web: has("TAVILY_API_KEY"),
      groq: has("GROQ_API_KEY"),
    },
    uji_serper: serperTest ?? "SERPER_API_KEY belum terpasang di Vercel (atau belum Redeploy setelah diisi).",
    versi_deploy: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev",
  });
}
