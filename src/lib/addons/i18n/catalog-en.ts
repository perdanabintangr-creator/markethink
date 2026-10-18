import type { AddonId, ToolId } from "@/lib/addons/catalog";
import type { ToolTier } from "@/lib/addons/tool-tier";

/**
 * English display text for the "Tools Pro" catalog (add-on groups, tools, agent examples, brain tiers).
 * Indonesian source of truth stays in `catalog.ts` / `agent/catalog.ts` / `tool-tier.ts` — this file is display-only.
 * Client-safe.
 */

export interface AddonTextEn {
  name: string;
  menu: string;
  tagline: string;
  role: string;
}

export interface ToolTextEn {
  name: string;
  menu: string;
  short: string;
  /** Same length & order as `ToolInfo.outputs`. */
  outputs: string[];
}

export const ADDONS_EN: Record<AddonId, AddonTextEn> = {
  strategi_pro: {
    name: "Strategy & Brand",
    menu: "Strategy & Brand",
    tagline: "Marketing plans, brand guidelines, campaign briefs & product launch plans",
    role: "Owner, Marketing Manager, Brand Manager",
  },
  riset_pro: {
    name: "Market Research Pro",
    menu: "Market Research",
    tagline: "Consultant-grade market research: market size, personas, competitors, feasibility & surveys",
    role: "Market Research, Strategy, Owner",
  },
  konten_pro: {
    name: "Content & Social",
    menu: "Content & Social",
    tagline: "Monthly content calendars, short-video scripts & social media account audits",
    role: "Content Strategist, Social Media Specialist, Copywriter",
  },
  dokter_iklan: {
    name: "Ads & Performance",
    menu: "Ads & Performance",
    tagline: "Ready-to-run ad variations, ad report scorecards & business calculators",
    role: "Performance Marketer, Ads Specialist",
  },
  jualan_kit: {
    name: "Online Selling",
    menu: "Online Selling",
    tagline: "Marketplace listings, live selling scripts & marketplace promo calendars",
    role: "E-commerce / Marketplace Specialist, Seller",
  },
  crm_pro: {
    name: "CRM & Retention",
    menu: "CRM & Retention",
    tagline: "WhatsApp templates, automated follow-up flows & loyalty programs",
    role: "CRM, Customer Service, Owner",
  },
  kolpr_pro: {
    name: "KOL & PR",
    menu: "KOL & PR",
    tagline: "KOL briefs, KOL performance reports & press releases",
    role: "KOL / Affiliate Specialist, PR & Communications",
  },
  laporan_pro: {
    name: "Marketing Reports",
    menu: "Reports",
    tagline: "Monthly marketing reports ready to present to your boss or clients",
    role: "Marketing Manager, Analyst, Agency",
  },
};

export const TOOLS_EN: Record<ToolId, ToolTextEn> = {
  // ------------------------------------------------ Strategy & Brand
  plan: {
    name: "Marketing Plan",
    menu: "Marketing Plan",
    short: "A 3–12 month marketing plan: goals & KPIs, target market, channel strategy, activity calendar and budget allocation.",
    outputs: ["Executive summary", "Goals & KPIs", "Channel strategy", "Roadmap & calendar", "Budget allocation", "Presentation PPT", "Budget Excel"],
  },
  brand: {
    name: "Brand Guideline",
    menu: "Brand Guideline",
    short: "Brand foundations: positioning, brand promise, personality, tone of voice, key messages, visual guide & do's/don'ts.",
    outputs: ["Positioning & brand promise", "Tone of voice + examples", "Key messages", "Visual guide", "Brand book PPT"],
  },
  campaign: {
    name: "Campaign Brief",
    menu: "Campaign Brief",
    short: "A campaign brief ready to send to your creative team/agency: insight, big idea, messaging, deliverables, timeline, budget & KPIs.",
    outputs: ["Insight & big idea", "Message & tagline", "Deliverables list", "Timeline", "Budget & KPIs", "Brief PPT"],
  },
  gtm: {
    name: "Product Launch Plan",
    menu: "Product Launch",
    short: "Go-to-market for a new product: target segments, positioning, pricing, channels, and pre-launch → launch → post-launch phases.",
    outputs: ["Positioning & value proposition", "Pricing strategy", "Launch phases", "Team checklist", "GTM PPT", "Timeline Excel"],
  },
  // ------------------------------------------------ Market Research
  sizing: {
    name: "Market Size & Trends",
    menu: "Market Size & Trends",
    short: "Calculate TAM/SAM/SOM with web research, a 5-year projection, trends & PESTEL analysis.",
    outputs: ["TAM/SAM/SOM + method", "3-scenario projection", "Trends & PESTEL", "Research sources", "Report PPT", "Excel model"],
  },
  persona: {
    name: "Segmentation & Customer Personas",
    menu: "Customer Personas",
    short: "The most attractive market segments, buyer personas, customer journey & consumer behavior insights.",
    outputs: ["Segment map", "Persona cards", "Customer journey", "Purchase decision factors", "Report PPT", "Excel"],
  },
  competitor: {
    name: "Competitor Research",
    menu: "Competitor Research",
    short: "Automated web research: pricing, strengths, positioning map, SWOT & content gaps.",
    outputs: ["Comparison table", "Brand positioning map", "SWOT", "Research sources", "Report PPT", "Excel"],
  },
  entry: {
    name: "Feasibility & Market Entry Strategy",
    menu: "Feasibility Study",
    short: "Feasibility study: go/no-go score, Porter's 5 Forces, permits & risks, pricing strategy and a 90-day plan.",
    outputs: ["Feasibility score", "Porter's 5 Forces", "Permits & regulations", "Risk map", "90-day plan", "Report PPT", "Excel"],
  },
  survey: {
    name: "Survey & Questionnaire Design",
    menu: "Survey Design",
    short: "A research-agency-grade questionnaire ready to send, plus sample size, screener & analysis plan.",
    outputs: ["Full questionnaire", "Sample size calculation", "Screener", "Analysis plan", "Excel ready for Google Forms"],
  },
  // ------------------------------------------------ Content & Social
  calendar: {
    name: "Monthly Content Calendar",
    menu: "Content Calendar",
    short: "Content pillars + a 1-month posting schedule per platform, complete with hooks, captions, formats, CTAs & hashtags.",
    outputs: ["Content pillars & mix", "Calendar by date", "Ready-to-post captions", "Key moments & dates", "Calendar Excel", "Summary PPT"],
  },
  script: {
    name: "Short Video Scripts",
    menu: "Video Scripts",
    short: "Second-by-second Reels/TikTok/Shorts scripts: 3-second hook, scenes, on-screen text, voice-over, CTA & shooting directions.",
    outputs: ["3–5 scene-by-scene scripts", "Hook variations", "Shot list", "Captions & hashtags", "Script Excel"],
  },
  audit: {
    name: "Social Media Account Audit",
    menu: "Social Account Audit",
    short: "Score your Instagram/TikTok account: bio, consistency, pillars, content performance, then a 30-day improvement plan.",
    outputs: ["Score per aspect", "Findings & evidence", "Bio & highlight fixes", "30-day plan", "Audit PPT"],
  },
  // ------------------------------------------------ Ads & Performance
  adcopy: {
    name: "Ad Variation Generator",
    menu: "Ad Variations",
    short: "Ready-to-run ad concepts & copy for Meta/TikTok/Google: distinct angles, headlines, primary text, visuals & an A/B test structure.",
    outputs: ["6–10 ad variations", "Angles & audiences", "Visual direction", "A/B test plan", "Upload-ready Excel"],
  },
  ads: {
    name: "Ad Report Analyst",
    menu: "Ad Report Analyst",
    short: "Upload Meta/TikTok/Shopee Ads reports → scorecard, wasteful vs winning ads, new budget.",
    outputs: ["Health score & charts", "Scorecard per campaign", "Budget recommendation", "Report PPT", "Color-coded Excel"],
  },
  calc: {
    name: "Business Calculator",
    menu: "Business Calculator",
    short: "Selling price from COGS, break-even ROAS, and ad budget for a revenue target.",
    outputs: ["Instant results", "Doesn't use quota"],
  },
  // ------------------------------------------------ Online Selling
  listing: {
    name: "Marketplace Listing Optimizer",
    menu: "Listing Optimizer",
    short: "Product titles, descriptions & keywords for Shopee, TikTok Shop and Tokopedia.",
    outputs: ["Title & description per platform", "Prioritized keyword table", "Before vs after", "Excel"],
  },
  live: {
    name: "Live Selling Script",
    menu: "Live Selling Script",
    short: "A timed live-stream rundown + host lines, flash sales & answers to buyer objections.",
    outputs: ["Minute-by-minute rundown", "Host cheat-sheet mode", "Cheat-sheet PPT", "Rundown Excel"],
  },
  promo: {
    name: "Marketplace Promo Calendar",
    menu: "Promo Calendar",
    short: "A 1–3 month promo plan around double dates, payday & shopping seasons: mechanics, vouchers, targets & stock prep.",
    outputs: ["Campaign calendar", "Mechanics & vouchers", "Promo margin calculation", "Prep checklist", "Calendar Excel"],
  },
  // ------------------------------------------------ CRM & Retention
  whatsapp: {
    name: "WhatsApp Templates",
    menu: "WhatsApp Templates",
    short: "Ready-to-send broadcast, follow-up & quick-reply messages.",
    outputs: ["WhatsApp bubble preview", "Copy buttons", "Template Excel"],
  },
  flow: {
    name: "Automated Follow-up Flow",
    menu: "Follow-up Flow",
    short: "A WhatsApp/email message sequence from first chat to repeat order: triggers, timing, message copy & how to measure it.",
    outputs: ["Customer flow map", "Messages per stage", "Send schedule", "Conversion targets", "Flow Excel"],
  },
  loyalty: {
    name: "Loyalty Program",
    menu: "Loyalty Program",
    short: "Design a profitable membership/points/tier program: rules, rewards, cost math, communication materials & KPIs.",
    outputs: ["Mechanics & tiers", "Cost vs profit math", "Announcement materials", "Launch plan", "Calculation Excel"],
  },
  // ------------------------------------------------ KOL & PR
  kol: {
    name: "KOL / Affiliate Brief",
    menu: "KOL Brief",
    short: "A ready-to-send creator brief + fee estimate & outreach DM.",
    outputs: ["Brief document", "Fee estimate", "DM template", "Brief PPT"],
  },
  kolreport: {
    name: "KOL Performance Report",
    menu: "KOL Report",
    short: "Upload/enter creator results → KOL ranking, cost per result, who to keep and who to stop.",
    outputs: ["Creator ranking", "CPM/CPE/cost per order", "Keep/stop recommendations", "Report PPT", "Color-coded Excel"],
  },
  press: {
    name: "Press Release",
    menu: "Press Release",
    short: "A press release in standard media format + alternative headlines, spokesperson quotes, target media list & pitch email.",
    outputs: ["Ready-to-send press release", "Headline variations", "Pitch email", "Target media list", "Journalist Q&A"],
  },
  // ------------------------------------------------ Reports
  report: {
    name: "Monthly Marketing Report",
    menu: "Monthly Report",
    short: "Upload this month's data (ads, social, sales) → a presentation-ready report: summary, KPIs vs targets, analysis & next month's plan.",
    outputs: ["Executive summary", "KPIs vs targets", "Analysis per channel", "Next month's plan", "Presentation-ready PPT", "Data Excel"],
  },
};

/** English counterpart of `AGENT_EXAMPLES` (same order). */
export const AGENT_EXAMPLES_EN = [
  "Prepare a Ramadan campaign for my online hijab store, targeting women aged 20–35, with an ad budget of Rp5 million.",
  "I'm launching a liter-size iced milk coffee in Bandung next month. Prepare the launch strategy all the way to a month of content.",
  "Market research & personas for a photobox business in Jakarta, then create a TikTok content plan that can go viral.",
  "Increase repeat orders for my beauty clinic: a loyalty program, a WhatsApp follow-up flow, and promos.",
];

export const TOOL_TIER_INFO_EN: Record<ToolTier, { label: string; hint: string }> = {
  senior: { label: "Senior", hint: "Balanced — fast & sharp for most work." },
  associate: { label: "Associate", hint: "Deep reasoning — deeper analysis (Pro/Promax plans). Takes a bit longer." },
  director: { label: "Director", hint: "The smartest brain (Promax plan) — uses 2 quota units per result. Slowest to process." },
};
