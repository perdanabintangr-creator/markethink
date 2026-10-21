"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speechChunks } from "@/lib/voice/speech";

/** Tipe minimal Web Speech API (belum ada di lib DOM bawaan TypeScript untuk versi webkit). */
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const voiceSupported = () => recognitionCtor() !== null && typeof window !== "undefined" && "speechSynthesis" in window;
export const dictationSupported = () => recognitionCtor() !== null;

/** Pilih suara paling natural untuk bahasa ini (suara "Google"/"Natural"/"Online" biasanya lebih halus). */
function pickVoice(lang: string) {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.slice(0, 2).toLowerCase();
  const same = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(base));
  return (
    same.find((v) => /natural|online|neural/i.test(v.name)) ??
    same.find((v) => /google/i.test(v.name)) ??
    same.find((v) => v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()) ??
    same[0] ??
    null
  );
}

export type ListenError = "denied" | "no-speech" | "other";

/**
 * Dengar (pengenal suara browser) & bicara (suara browser). Satu instance per komponen.
 * `listen` mengembalikan teks akhir lewat `onFinal`; `speak` membacakan teks per kalimat lalu memanggil `onDone`.
 */
export function useVoice(lang: string) {
  const recRef = useRef<Recognition | null>(null);
  const speakToken = useRef(0);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");

  // Muat daftar suara lebih awal (Chrome mengisinya secara async).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    const onChange = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", onChange);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", onChange);
  }, []);

  const stopListening = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {}
    }
    setListening(false);
    setInterim("");
  }, []);

  const listen = useCallback(
    (opts: { continuous?: boolean; onFinal: (text: string) => void; onInterim?: (text: string) => void; onEnd?: (err?: ListenError) => void }) => {
      const Ctor = recognitionCtor();
      if (!Ctor) return false;
      stopListening();
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = Boolean(opts.continuous);
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      let finalText = "";
      let error: ListenError | undefined;
      rec.onresult = (e) => {
        let live = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            finalText += `${r[0].transcript} `;
            if (opts.continuous) opts.onFinal(r[0].transcript.trim());
          } else live += r[0].transcript;
        }
        const shown = (opts.continuous ? live : `${finalText}${live}`).trim();
        setInterim(shown);
        opts.onInterim?.(shown);
      };
      rec.onerror = (e) => {
        error = e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : e.error === "no-speech" ? "no-speech" : e.error === "aborted" ? undefined : "other";
      };
      rec.onend = () => {
        if (recRef.current !== rec) return;
        recRef.current = null;
        setListening(false);
        setInterim("");
        const text = finalText.trim();
        if (!opts.continuous && text) opts.onFinal(text);
        opts.onEnd?.(text ? undefined : (error ?? (opts.continuous ? undefined : "no-speech")));
      };
      recRef.current = rec;
      try {
        rec.start();
      } catch {
        recRef.current = null;
        return false;
      }
      setListening(true);
      return true;
    },
    [lang, stopListening],
  );

  const stopSpeaking = useCallback(() => {
    speakToken.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        onDone?.();
        return;
      }
      const synth = window.speechSynthesis;
      synth.cancel();
      const token = ++speakToken.current;
      const chunks = speechChunks(text);
      if (!chunks.length) {
        onDone?.();
        return;
      }
      const voice = pickVoice(lang);
      setSpeaking(true);
      let i = 0;
      const next = () => {
        if (token !== speakToken.current) return;
        if (i >= chunks.length) {
          setSpeaking(false);
          onDone?.();
          return;
        }
        const u = new SpeechSynthesisUtterance(chunks[i++]);
        u.lang = lang;
        if (voice) u.voice = voice;
        u.rate = 1.05;
        u.onend = next;
        u.onerror = next;
        synth.speak(u);
      };
      next();
    },
    [lang],
  );

  useEffect(
    () => () => {
      stopListening();
      stopSpeaking();
    },
    [stopListening, stopSpeaking],
  );

  return { listening, speaking, interim, listen, stopListening, speak, stopSpeaking };
}
