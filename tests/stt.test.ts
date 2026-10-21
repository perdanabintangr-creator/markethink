import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { cleanTranscript, keepSegments, sttEnabled } = await import("@/lib/voice/stt");

describe("penyaring transkrip", () => {
  it("membuang kalimat hantu Whisper & musik", () => {
    expect(cleanTranscript("Terima kasih telah menonton!")).toBe("");
    expect(cleanTranscript("[Music]")).toBe("");
    expect(cleanTranscript("♪♪")).toBe("");
    expect(cleanTranscript("  bikin   strategi konten ")).toBe("bikin strategi konten");
  });
  it("membuang segmen yang bukan ucapan", () => {
    expect(
      keepSegments([
        { text: "bikin poster", no_speech_prob: 0.05, avg_logprob: -0.2 },
        { text: "la la la", no_speech_prob: 0.9, avg_logprob: -0.3 },
        { text: "zzz", no_speech_prob: 0.1, avg_logprob: -1.6 },
      ]),
    ).toBe("bikin poster");
  });
  it("mati sampai founder menyalakan VOICE_STT=groq", () => {
    vi.stubEnv("VOICE_STT", "");
    vi.stubEnv("GROQ_API_KEY", "x");
    expect(sttEnabled()).toBe(false);
    vi.stubEnv("VOICE_STT", "groq");
    expect(sttEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });
});
