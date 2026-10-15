import "server-only";
import type { z } from "zod";
import type { Runner } from "../../tools";
import { brandRunner } from "../defs/brand";
import { campaignRunner } from "../defs/campaign";
import { gtmRunner } from "../defs/gtm";
import { planRunner } from "../defs/plan";

/** Runner tools kelompok "strategi" (server). Tambahkan: <tool>: <tool>Runner */
export const RUNNERS: Record<string, Runner<z.ZodTypeAny>> = {
  plan: planRunner,
  brand: brandRunner,
  campaign: campaignRunner,
  gtm: gtmRunner,
};
