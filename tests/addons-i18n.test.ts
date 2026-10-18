import { describe, expect, it } from "vitest";
import { ADDONS, MENU_GROUPS, TOOLS } from "@/lib/addons/catalog";
import { PRO_FORMS } from "@/lib/addons/pro/forms";
import { AGENT_EXAMPLES, AGENT_TOOLS } from "@/lib/agent/catalog";
import { TOOL_TIERS } from "@/lib/addons/tool-tier";
import {
  ADDONS_EN,
  FORMS_EN,
  TOOLS_EN,
  agentExamples,
  localizeAddonInfo,
  localizeAgentTool,
  localizeForm,
  localizeToolInfo,
  localizedCreditText,
  localizedMenuGroups,
  menuGroupLabel,
  monthLabelEn,
  proForm,
  toolTierInfo,
} from "@/lib/addons/i18n";
import { creditText, type ToolAccessLite } from "@/lib/addons/format";

const MONTH_LABEL = /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) \d{4}$/;

describe("Tools Pro forms — English", () => {
  for (const [tool, form] of Object.entries(PRO_FORMS)) {
    describe(tool, () => {
      const en = FORMS_EN[tool];

      it("has English text for every field, option & step", () => {
        expect(en, `FORMS_EN.${tool}`).toBeDefined();
        expect(en.steps).toHaveLength(form.steps.length);
        for (const f of form.fields) {
          const fe = en.fields[f.name];
          expect(fe?.label, `${tool}.${f.name}.label`).toBeTruthy();
          if (f.hint) expect(fe.hint, `${tool}.${f.name}.hint`).toBeTruthy();
          if ("placeholder" in f && f.placeholder) expect(fe.placeholder, `${tool}.${f.name}.placeholder`).toBeTruthy();
          if (f.type === "number" && f.suffix) expect(fe.suffix, `${tool}.${f.name}.suffix`).toBeTruthy();
          if (f.type === "select" || f.type === "chips") {
            for (const o of f.options) {
              // Dynamic month options ("Oktober 2026") are translated by monthLabelEn.
              const label = fe.options?.[o.value] ?? (MONTH_LABEL.test(o.label) ? monthLabelEn(o.label) : undefined);
              expect(label, `${tool}.${f.name}.options.${o.value}`).toBeTruthy();
            }
          }
        }
        // No stale keys for fields that no longer exist.
        const names = new Set(form.fields.map((f) => f.name));
        for (const k of Object.keys(en.fields)) expect(names.has(k), `${tool}.${k} not in form`).toBe(true);
      });

      it("English form keeps names, values & structure", () => {
        const loc = localizeForm(tool, form, "en");
        expect(loc.steps).toEqual(en.steps);
        expect(loc.fields).toHaveLength(form.fields.length);
        loc.fields.forEach((lf, i) => {
          const f = form.fields[i];
          expect(lf.name).toBe(f.name);
          expect(lf.type).toBe(f.type);
          expect(lf.label).toBe(en.fields[f.name].label);
          if ((f.type === "select" || f.type === "chips") && (lf.type === "select" || lf.type === "chips")) {
            expect(lf.options.map((o) => o.value)).toEqual(f.options.map((o) => o.value));
            lf.options.forEach((o, j) => {
              const src = f.options[j].label;
              expect(o.label).toBe(en.fields[f.name].options?.[o.value] ?? (MONTH_LABEL.test(src) ? monthLabelEn(src) : src));
            });
          }
          if (f.type === "select" && lf.type === "select") expect(lf.default).toBe(f.default);
          if (f.type === "chips" && lf.type === "chips") expect(lf.defaults).toEqual(f.defaults);
        });
        // Source form is not mutated.
        expect(JSON.stringify(form)).toBe(JSON.stringify(PRO_FORMS[tool]));
      });

      it("Indonesian form is identical", () => {
        const before = JSON.stringify(form);
        expect(localizeForm(tool, form, "id")).toBe(form);
        expect(JSON.stringify(proForm(tool, "id"))).toBe(before);
        localizeForm(tool, form, "en");
        expect(JSON.stringify(form)).toBe(before);
      });
    });
  }

  it("translates month labels", () => {
    expect(monthLabelEn("Oktober 2026")).toBe("October 2026");
    expect(monthLabelEn("Mei 2027")).toBe("May 2027");
    expect(monthLabelEn("Bukan bulan")).toBeNull();
  });
});

describe("Tools Pro catalog — English", () => {
  it("covers every tool & add-on", () => {
    for (const t of TOOLS) {
      const en = TOOLS_EN[t.id];
      expect(en?.name, t.id).toBeTruthy();
      expect(en.menu, t.id).toBeTruthy();
      expect(en.short, t.id).toBeTruthy();
      expect(en.outputs, `${t.id}.outputs`).toHaveLength(t.outputs.length);
      const loc = localizeToolInfo(t, "en");
      expect(loc.id).toBe(t.id);
      expect(loc.addon).toBe(t.addon);
      expect(loc.name).toBe(en.name);
      expect(localizeToolInfo(t, "id")).toBe(t);
    }
    for (const a of ADDONS) {
      const en = ADDONS_EN[a.id];
      for (const k of ["name", "menu", "tagline", "role"] as const) expect(en?.[k], `${a.id}.${k}`).toBeTruthy();
      const loc = localizeAddonInfo(a, "en");
      expect(loc.tools).toEqual(a.tools);
      expect(localizeAddonInfo(a, "id")).toBe(a);
    }
  });

  it("menu groups", () => {
    expect(localizedMenuGroups("id")).toEqual(MENU_GROUPS);
    const en = localizedMenuGroups("en");
    expect(en.map((g) => g.addon)).toEqual(MENU_GROUPS.map((g) => g.addon));
    expect(menuGroupLabel("konten_pro", "en")).toBe("Content & Social");
    expect(menuGroupLabel("Konten & Sosmed", "en")).toBe("Content & Social");
    expect(menuGroupLabel("Konten & Sosmed", "id")).toBe("Konten & Sosmed");
    expect(menuGroupLabel("unknown", "en")).toBe("unknown");
  });

  it("agent catalog & tiers", () => {
    for (const t of AGENT_TOOLS) expect(localizeAgentTool(t, "en").name).toBe(TOOLS_EN[t.id].name);
    expect(agentExamples("id")).toBe(AGENT_EXAMPLES);
    expect(agentExamples("en")).toHaveLength(AGENT_EXAMPLES.length);
    for (const tier of TOOL_TIERS) expect(toolTierInfo(tier, "en").hint).toBeTruthy();
  });

  it("credit text matches format.ts in Indonesian", () => {
    const base: ToolAccessLite = { allowed: true, agent: true, isAdmin: false, isFree: false, planId: "pro", remaining: 400, monthLimit: 1000 };
    const cases: ToolAccessLite[] = [base, { ...base, isAdmin: true }, { ...base, allowed: false }, { ...base, allowed: false, isFree: true }];
    for (const c of cases) {
      expect(localizedCreditText(c, "id")).toBe(creditText(c));
      expect(localizedCreditText(c, "en")).not.toBe(creditText(c));
    }
  });
});
