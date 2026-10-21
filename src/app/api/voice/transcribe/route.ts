import { apiSession, jsonError } from "@/lib/api";
import { guardRequest } from "@/lib/ratelimit";
import { sttEnabled, transcribe } from "@/lib/voice/stt";

export const maxDuration = 30;

/** Maks ±60 detik suara WAV 16 kHz mono. */
const MAX_BYTES = 2_000_000;

/** Ubah potongan suara user (mode Ngobrol) jadi teks. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!sttEnabled()) return jsonError(503, "stt_disabled");
  if (!(await guardRequest(s.user.id, req.headers))) return jsonError(429, "rate_limited");
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size < 1000) return jsonError(400, "invalid_audio");
  if (audio.size > MAX_BYTES) return jsonError(413, "audio_too_long");
  const lang = form?.get("lang") === "en" ? "en" : "id";
  try {
    return Response.json({ text: await transcribe(audio, lang) });
  } catch (err) {
    console.error("[voice] transcribe gagal", err);
    return jsonError(502, "stt_failed");
  }
}
