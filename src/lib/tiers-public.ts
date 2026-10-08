import { getTiers, type TierId } from "@/lib/ai/models.config";
import type { TierOption } from "@/components/chat/model-selector";

/** Data tier yang aman dikirim ke client (tanpa model id/provider). */
export function publicTiers(): TierOption[] {
  return getTiers().map(({ id, label, tagline, description, skills, creditCost }) => ({ id, label, tagline, description, skills, creditCost }));
}

export function isTier(v: unknown): v is TierId {
  return v === "junior" || v === "senior" || v === "associate";
}
