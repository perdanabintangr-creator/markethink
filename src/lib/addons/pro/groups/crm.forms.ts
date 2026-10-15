import type { ToolForm } from "../fields";
import { flowForm } from "../specs/flow";
import { loyaltyForm } from "../specs/loyalty";
import { promoForm } from "../specs/promo";

/** Form tools kelompok "crm" (aman untuk client). Tambahkan: <tool>: <tool>Form */
export const FORMS: Record<string, ToolForm> = {
  promo: promoForm,
  flow: flowForm,
  loyalty: loyaltyForm,
};
