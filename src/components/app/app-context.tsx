"use client";

import { createContext, useContext } from "react";
import type { Dict, Lang } from "@/lib/i18n/dict";
import type { WorkspaceSummary } from "@/lib/types";
import type { TierId } from "@/lib/ai/models.config";
import type { TierChoice } from "@/lib/ai/auto-tier";

export interface AppContextValue {
  user: { id: string; email: string | null; name: string | null; avatar: string | null; role: "user" | "admin" };
  lang: Lang;
  t: Dict;
  workspaces: WorkspaceSummary[];
  /** Kredit bulan ini (reset tgl 1, 00.00 WIB). */
  credits: { monthLimit: number; remaining: number };
  /** Tier otak yang boleh dipakai sesuai paket user. */
  allowedTiers: TierId[];
  planName: string;
  /** ID paket (beta = Free) — mis. untuk menandai Tools Pro yang terkunci. */
  planId: string;
  /** Paket memakai model gratis (Gemini free tier) → tampilkan pemberitahuan privasi. */
  freeModels: boolean;
  /** Riset Web (pencarian Google) termasuk paket — Free tidak. */
  researchAllowed: boolean;
}

/** Tier awal: preferensi bila diizinkan, selain itu Senior bila boleh, selain itu tier pertama yang diizinkan. */
export function pickTier(preferred: TierId | null | undefined, allowed: TierId[]): TierId {
  if (preferred && allowed.includes(preferred)) return preferred;
  if (allowed.includes("senior")) return "senior";
  return allowed[0] ?? "junior";
}

/** Pilihan otak di chat: bawaannya Otak Otomatis bila paket membuka Junior & Senior. */
export function pickTierChoice(preferred: string | null | undefined, allowed: TierId[]): TierChoice {
  const autoOk = allowed.includes("junior") && allowed.includes("senior");
  if (preferred === "auto" || !preferred) return autoOk ? "auto" : pickTier(null, allowed);
  return pickTier(preferred as TierId, allowed);
}

const Ctx = createContext<AppContextValue | null>(null);

export const AppContextProvider = Ctx.Provider;

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp di luar AppContextProvider");
  return v;
}
