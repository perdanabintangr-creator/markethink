import { getSession, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAddonOffers, getAddonQuotas, getBundleOffers } from "@/lib/addons/access";
import { hasMemberDiscount } from "@/lib/addons/addon-quota";
import { localizedAddons, localizedTools } from "@/lib/addons/i18n";
import { addonsStoreText } from "@/lib/i18n/addons-store";
import { dateL } from "@/lib/i18n/tools";
import { AddonStore } from "@/components/tools/addon-store";

export async function generateMetadata() {
  const { profile } = await getSession();
  return { title: addonsStoreText(profile?.language).title };
}
export const dynamic = "force-dynamic";

/** Toko Add-on Smart Tools: eceran per kelompok tool + bundel hemat; member Pro/Promax diskon 15%. */
export default async function AddonStorePage() {
  const { profile } = await requireUser();
  const admin = createAdminClient();
  const lang = profile.language;
  const [offers, bundles, quotas] = await Promise.all([
    getAddonOffers(admin, profile.plan_id),
    getBundleOffers(admin, profile.plan_id),
    getAddonQuotas(admin, profile.id),
  ]);
  const tools = localizedTools(lang);
  const addons = localizedAddons(lang)
    .filter((a) => offers[a.id])
    .map((a) => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      tagline: a.tagline,
      tools: tools.filter((t) => t.addon === a.id && !t.noQuota).map((t) => t.name),
      offer: offers[a.id],
      active: quotas[a.id]?.active ? { remaining: quotas[a.id].remaining, until: dateL(quotas[a.id].paidUntil, lang) } : null,
    }));
  return <AddonStore addons={addons} bundles={bundles} member={hasMemberDiscount(profile.plan_id)} isAdmin={profile.role === "admin"} />;
}
