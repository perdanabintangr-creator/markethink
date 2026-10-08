"use client";

import { createContext, useContext } from "react";
import type { Dict, Lang } from "@/lib/i18n/dict";
import type { WorkspaceSummary } from "@/lib/types";

export interface AppContextValue {
  user: { id: string; email: string | null; name: string | null; avatar: string | null; role: "user" | "admin" };
  lang: Lang;
  t: Dict;
  workspaces: WorkspaceSummary[];
  credits: { dailyLimit: number; remaining: number };
}

const Ctx = createContext<AppContextValue | null>(null);

export const AppContextProvider = Ctx.Provider;

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp di luar AppContextProvider");
  return v;
}
