"use client";

import { createContext, useContext } from "react";
import type { Dict, Lang } from "@/lib/i18n/dict";
import type { WorkspaceSummary } from "@/lib/types";
import type { TierId } from "@/lib/ai/models.config";

export interface AppContextValue {
  user: { id: string; email: string | null; name: string | null; avatar: string | null; role: "user" | "admin" };
  lang: Lang;
  t: Dict;
  workspaces: WorkspaceSummary[];
  credits: { dailyLimit: number; remaining: number };
  /** Tier otak yang boleh dipakai sesuai paket user. */
  allowedTiers: TierId[];
  planName: string;
}

/** Tier awal: preferensi bila diizinkan, selain itu Senior bila boleh, selain itu tier pertama yang diizinkan. */
export function pickTier(preferred: TierId | null | undefined, allowed: TierId[]): TierId {
  if (preferred && allowed.includes(preferred)) return preferred;
  if (allowed.includes("senior")) return "senior";
  return allowed[0] ?? "junior";
}

const Ctx = createContext<AppContextValue | null>(null);

export const AppContextProvider = Ctx.Provider;

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp di luar AppContextProvider");
  return v;
}
