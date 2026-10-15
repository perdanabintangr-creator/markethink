import "server-only";
import type { z } from "zod";
import type { Runner } from "../../tools";

/** Runner tools kelompok "crm" (server). Tambahkan: <tool>: <tool>Runner */
export const RUNNERS: Record<string, Runner<z.ZodTypeAny>> = {};
