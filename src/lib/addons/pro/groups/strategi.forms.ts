import type { ToolForm } from "../fields";
import { brandForm } from "../specs/brand";
import { campaignForm } from "../specs/campaign";
import { gtmForm } from "../specs/gtm";
import { planForm } from "../specs/plan";

/** Form tools kelompok "strategi" (aman untuk client). Tambahkan: <tool>: <tool>Form */
export const FORMS: Record<string, ToolForm> = {
  plan: planForm,
  brand: brandForm,
  campaign: campaignForm,
  gtm: gtmForm,
};
