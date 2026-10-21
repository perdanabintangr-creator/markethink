"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MicVAD } from "@ricky0123/vad-web";
import { encodeWav, rms } from "@/lib/voice/wav";

/** Potongan suara di bawah kekerasan ini dianggap suara latar/jauh (bukan orang yang bicara ke AI). */
const MIN_RMS = 0.012;

export type VadError = "denied" | "load_failed";

/**
 * Pendeteksi suara manusia (Silero VAD, jalan di browser): hanya bereaksi pada ucapan orang, mengabaikan musik & bising,
 * dan langsung tahu saat user selesai bicara. Mic memakai peredam bising & peredam gema bawaan browser.
 */
export function useVad(opts: { onSpeech: (wav: Blob) => void; onSpeaking?: (speaking: boolean) => void }) {
  const vadRef = useRef<MicVAD | null>(null);
  const cbRef = useRef(opts);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    cbRef.current = opts;
  });

  const load = useCallback(async (): Promise<VadError | null> => {
    if (vadRef.current) return null;
    try {
      const { MicVAD } = await import("@ricky0123/vad-web");
      vadRef.current = await MicVAD.new({
        model: "legacy",
        baseAssetPath: "/vad/",
        onnxWASMBasePath: "/vad/",
        startOnLoad: false,
        // Lebih ketat dari bawaan supaya musik & obrolan latar tidak dianggap ucapan.
        positiveSpeechThreshold: 0.8,
        negativeSpeechThreshold: 0.6,
        redemptionMs: 700,
        preSpeechPadMs: 300,
        minSpeechMs: 500,
        getStream: () =>
          navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          }),
        onSpeechStart: () => cbRef.current.onSpeaking?.(true),
        onVADMisfire: () => cbRef.current.onSpeaking?.(false),
        onSpeechEnd: (audio) => {
          cbRef.current.onSpeaking?.(false);
          if (rms(audio) < MIN_RMS) return;
          cbRef.current.onSpeech(new Blob([encodeWav(audio)], { type: "audio/wav" }));
        },
      });
      setReady(true);
      return null;
    } catch (err) {
      vadRef.current = null;
      const name = (err as { name?: string })?.name;
      return name === "NotAllowedError" || name === "SecurityError" ? "denied" : "load_failed";
    }
  }, []);

  const start = useCallback(async () => {
    const err = await load();
    if (err) return err;
    await vadRef.current?.start();
    setActive(true);
    return null;
  }, [load]);

  const pause = useCallback(async () => {
    setActive(false);
    await vadRef.current?.pause().catch(() => {});
  }, []);

  useEffect(
    () => () => {
      void vadRef.current?.destroy().catch(() => {});
      vadRef.current = null;
    },
    [],
  );

  return { ready, active, start, pause };
}
