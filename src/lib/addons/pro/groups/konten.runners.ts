import "server-only";
import type { z } from "zod";
import type { Runner } from "../../tools";
import { adcopyRunner } from "../defs/adcopy";
import { auditRunner } from "../defs/audit";
import { scriptRunner } from "../defs/script";

/** Runner tools kelompok "konten" (server). Tambahkan: <tool>: <tool>Runner */
export const RUNNERS: Record<string, Runner<z.ZodTypeAny>> = {
  script: scriptRunner,
  audit: auditRunner,
  adcopy: adcopyRunner,
};
