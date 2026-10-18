/**
 * Localization API for the Tools Pro catalog & forms (display text only). Client-safe — no "server-only" imports.
 *
 * Indonesian ("id") always returns the original objects/strings untouched. English ("en") returns copies with
 * English display text; ids, option `value`s and field `name`s never change, and any missing English string falls
 * back to the Indonesian one. Server validation (`schemaFromFields`) and AI briefs (`briefFromFields`) must keep
 * using the original Indonesian `PRO_FORMS` — only pass localized forms to the UI.
 *
 * Usage:
 *   import { localizeForm, localizeToolInfo, menuGroupLabel } from "@/lib/addons/i18n";
 *   const form = localizeForm(tool, PRO_FORMS[tool], lang);   // or proForm(tool, lang)
 *   const info = localizeToolInfo(toolInfo(tool)!, lang);      // name / menu / short / outputs
 *   const addon = localizeAddonInfo(addonInfo(id)!, lang);     // name / menu / tagline / role
 *   localizedMenuGroups(lang).map((g) => g.label);             // sidebar groups (= MENU_GROUPS)
 *   agentExamples(lang); toolTierInfo("senior", lang); localizedCreditText(access, lang);
 */
import { ADDONS, MENU_GROUPS, TOOLS, type AddonInfo, type ToolInfo } from "@/lib/addons/catalog";
import { quotaLeftPct, type ToolAccessLite } from "@/lib/addons/format";
import type { Field, ToolForm } from "@/lib/addons/pro/fields";
import { PRO_FORMS } from "@/lib/addons/pro/forms";
import { TOOL_TIER_INFO, type ToolTier } from "@/lib/addons/tool-tier";
import { AGENT_EXAMPLES } from "@/lib/agent/catalog";
import type { Lang } from "@/lib/i18n/dict";
import { ADDONS_EN, AGENT_EXAMPLES_EN, TOOLS_EN, TOOL_TIER_INFO_EN } from "./catalog-en";
import { FORMS_EN } from "./forms-en";

export type { Lang };
export { ADDONS_EN, AGENT_EXAMPLES_EN, TOOLS_EN, TOOL_TIER_INFO_EN, FORMS_EN };

const isEn = (lang: Lang | null | undefined) => lang === "en";

// ------------------------------------------------------------------ months

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Oktober 2026" → "October 2026" (null when the text is not an Indonesian "Month YYYY" label). */
export function monthLabelEn(label: string): string | null {
  const m = /^(\S+) (\d{4})$/.exec(label.trim());
  const i = m ? MONTHS_ID.indexOf(m[1]) : -1;
  return m && i >= 0 ? `${MONTHS_EN[i]} ${m[2]}` : null;
}

/** Month label from a "YYYY-MM" value in the given language, e.g. "2026-10" → "Oktober 2026" / "October 2026". */
export function monthLabelL(ym: string, lang: Lang | null | undefined) {
  const [y, m] = ym.split("-").map(Number);
  return `${(isEn(lang) ? MONTHS_EN : MONTHS_ID)[(m || 1) - 1]} ${y}`;
}

// ------------------------------------------------------------------ forms

/**
 * Form with display text in `lang` (label, hint, placeholder, option labels, suffix, steps).
 * "id" returns `form` itself. Structure, `name`s, `value`s, defaults and limits are kept as is.
 */
export function localizeForm(toolId: string, form: ToolForm, lang: Lang | null | undefined): ToolForm {
  if (!isEn(lang)) return form;
  const en = FORMS_EN[toolId];
  return {
    fields: form.fields.map((f) => localizeField(f, en?.fields[f.name])),
    steps: form.steps.map((s, i) => en?.steps[i] ?? s),
  };
}

function localizeField(f: Field, en: (typeof FORMS_EN)[string]["fields"][string] | undefined): Field {
  const out = { ...f, label: en?.label ?? f.label } as Field & { hint?: string; placeholder?: string; suffix?: string };
  if (f.hint !== undefined) out.hint = en?.hint ?? f.hint;
  if ("placeholder" in f && f.placeholder !== undefined) out.placeholder = en?.placeholder ?? f.placeholder;
  if (f.type === "number" && f.suffix !== undefined) out.suffix = en?.suffix ?? f.suffix;
  if (f.type === "select" || f.type === "chips") {
    (out as typeof f).options = f.options.map((o) => ({ value: o.value, label: en?.options?.[o.value] ?? monthLabelEn(o.label) ?? o.label }));
  }
  return out;
}

/** Shortcut: localized `PRO_FORMS[toolId]` (undefined when the tool has no Pro form). */
export function proForm(toolId: string, lang: Lang | null | undefined): ToolForm | undefined {
  const form = PRO_FORMS[toolId];
  return form ? localizeForm(toolId, form, lang) : undefined;
}

/** Progress steps of a Pro form in `lang` (undefined when the tool has no Pro form). */
export const proFormSteps = (toolId: string, lang: Lang | null | undefined) => proForm(toolId, lang)?.steps;

// ------------------------------------------------------------------ catalog

/** Tool card/menu text in `lang` (name, menu, short, outputs). "id" returns `info` itself. */
export function localizeToolInfo<T extends ToolInfo>(info: T, lang: Lang | null | undefined): T {
  const en = isEn(lang) ? TOOLS_EN[info.id] : undefined;
  if (!en) return info;
  return { ...info, name: en.name, menu: en.menu, short: en.short, outputs: info.outputs.map((o, i) => en.outputs[i] ?? o) };
}

/** Add-on group text in `lang` (name, menu, tagline, role). "id" returns `info` itself. */
export function localizeAddonInfo<T extends AddonInfo>(info: T, lang: Lang | null | undefined): T {
  const en = isEn(lang) ? ADDONS_EN[info.id] : undefined;
  if (!en) return info;
  return { ...info, name: en.name, menu: en.menu, tagline: en.tagline, role: en.role };
}

/** Localized `toolInfo(id)`. */
export function toolInfoL(id: string, lang: Lang | null | undefined) {
  const info = TOOLS.find((t) => t.id === id);
  return info ? localizeToolInfo(info, lang) : undefined;
}

/** Localized `addonInfo(id)`. */
export function addonInfoL(id: string, lang: Lang | null | undefined) {
  const info = ADDONS.find((a) => a.id === id);
  return info ? localizeAddonInfo(info, lang) : undefined;
}

/** Localized tool name / sidebar menu label by tool id (falls back to the id itself when unknown). */
export const toolNameL = (id: string, lang: Lang | null | undefined) => toolInfoL(id, lang)?.name ?? id;
export const toolMenuL = (id: string, lang: Lang | null | undefined) => toolInfoL(id, lang)?.menu ?? id;

/** All add-ons / tools with display text in `lang` (same order as ADDONS / TOOLS). */
export const localizedAddons = (lang: Lang | null | undefined) => ADDONS.map((a) => localizeAddonInfo(a, lang));
export const localizedTools = (lang: Lang | null | undefined) => TOOLS.map((t) => localizeToolInfo(t, lang));

/**
 * Sidebar menu group label in `lang`. Accepts an add-on id ("konten_pro") or the Indonesian menu label
 * ("Konten & Sosmed"); unknown input is returned unchanged.
 */
export function menuGroupLabel(addonIdOrLabel: string, lang: Lang | null | undefined): string {
  const a = ADDONS.find((x) => x.id === addonIdOrLabel) ?? ADDONS.find((x) => x.menu === addonIdOrLabel);
  if (!a) return addonIdOrLabel;
  return isEn(lang) ? ADDONS_EN[a.id].menu : a.menu;
}

/** `MENU_GROUPS` with labels in `lang`. */
export const localizedMenuGroups = (lang: Lang | null | undefined) =>
  MENU_GROUPS.map((g) => ({ addon: g.addon, label: menuGroupLabel(g.addon, lang) }));

/** Section name "Tools Pro" / "Pro Tools". */
export const proToolsLabel = (lang: Lang | null | undefined) => (isEn(lang) ? "Pro Tools" : "Tools Pro");

// ------------------------------------------------------------------ agent

/** Agent tools are catalog tools: same localization as `localizeToolInfo`. */
export const localizeAgentTool = localizeToolInfo;

/** Example missions for the Agent page in `lang`. */
export const agentExamples = (lang: Lang | null | undefined): string[] => (isEn(lang) ? AGENT_EXAMPLES_EN : AGENT_EXAMPLES);

// ------------------------------------------------------------------ brain tiers & quota text

/** Brain tier label & hint in `lang` (TOOL_TIER_INFO). */
export const toolTierInfo = (tier: ToolTier, lang: Lang | null | undefined) => (isEn(lang) ? TOOL_TIER_INFO_EN : TOOL_TIER_INFO)[tier];

/** Tooltip for a tier locked by the user's plan (brain picker). */
export function toolTierLockedHint(tier: ToolTier, lang: Lang | null | undefined) {
  if (tier === "director") return isEn(lang) ? "Director is available on the Promax plan" : "Director tersedia di paket Promax";
  return isEn(lang) ? "Associate is available from the Pro plan" : "Associate tersedia mulai paket Pro";
}

/** `creditText` (format.ts) in `lang`. "id" output is identical to `creditText`. */
export function localizedCreditText(a: ToolAccessLite, lang: Lang | null | undefined) {
  const en = isEn(lang);
  if (a.isAdmin) return en ? "Admin · unlimited" : "Admin · tanpa batas";
  if (a.via === "addon" && a.addon) {
    const until = a.addon.paidUntil
      ? new Date(a.addon.paidUntil).toLocaleDateString(en ? "en-US" : "id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })
      : "-";
    return en
      ? `Add-on until ${until} · ${a.addon.remaining} of ${a.addon.quota} results left this month`
      : `Add-on s.d. ${until} · sisa ${a.addon.remaining} dari ${a.addon.quota} hasil bulan ini`;
  }
  if (!a.allowed) {
    if (a.isFree) return en ? "🔒 Locked on the Free plan" : "🔒 Terkunci di paket Free";
    return en ? "🔒 Not included in your plan" : "🔒 Tidak termasuk paket kamu";
  }
  const pct = quotaLeftPct(a.remaining, a.monthLimit);
  return en ? `${pct}% of this month's quota left` : `Kuota bulan ini tersisa ${pct}%`;
}

/** "Doesn't use quota" label for no-quota tools (e.g. the calculator). */
export const noQuotaLabel = (lang: Lang | null | undefined) => (isEn(lang) ? "Doesn't use quota" : "Tidak memakai kuota");
