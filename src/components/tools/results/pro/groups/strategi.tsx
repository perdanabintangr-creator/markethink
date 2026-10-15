"use client";

import type { BrandOutput } from "@/lib/addons/pro/specs/brand";
import type { CampaignOutput } from "@/lib/addons/pro/specs/campaign";
import type { GtmOutput } from "@/lib/addons/pro/specs/gtm";
import type { PlanOutput } from "@/lib/addons/pro/specs/plan";
import { BrandResult } from "../brand";
import { CampaignResult } from "../campaign";
import { GtmResult } from "../gtm";
import { PlanResult } from "../plan";

/** Halaman hasil tools kelompok "strategi". Tambahkan: <tool>: ({ data }) => <XxxResult data={data as XxxOutput} /> */
export const VIEWS: Record<string, (props: { data: unknown; input: Record<string, unknown> }) => React.ReactNode> = {
  plan: ({ data }) => <PlanResult data={data as PlanOutput} />,
  brand: ({ data }) => <BrandResult data={data as BrandOutput} />,
  campaign: ({ data }) => <CampaignResult data={data as CampaignOutput} />,
  gtm: ({ data }) => <GtmResult data={data as GtmOutput} />,
};
