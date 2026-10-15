import "server-only";
import type { z } from "zod";
import type { Runner } from "../../tools";
import { kolreportRunner } from "../defs/kolreport";
import { pressRunner } from "../defs/press";

/** Runner tools kelompok "kolpr" (server). Tambahkan: <tool>: <tool>Runner */
export const RUNNERS: Record<string, Runner<z.ZodTypeAny>> = {
  kolreport: kolreportRunner,
  press: pressRunner,
};
