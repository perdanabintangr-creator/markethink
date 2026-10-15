import "server-only";
import type { z } from "zod";
import type { Runner } from "../../tools";
import { flowRunner } from "../defs/flow";
import { loyaltyRunner } from "../defs/loyalty";
import { promoRunner } from "../defs/promo";

/** Runner tools kelompok "crm" (server). Tambahkan: <tool>: <tool>Runner */
export const RUNNERS: Record<string, Runner<z.ZodTypeAny>> = {
  promo: promoRunner,
  flow: flowRunner,
  loyalty: loyaltyRunner,
};
