"use client";

import type { FlowOutput } from "@/lib/addons/pro/specs/flow";
import type { LoyaltyOutput } from "@/lib/addons/pro/specs/loyalty";
import type { PromoOutput } from "@/lib/addons/pro/specs/promo";
import { FlowResult } from "../flow";
import { LoyaltyResult } from "../loyalty";
import { PromoResult } from "../promo";

/** Halaman hasil tools kelompok "crm". Tambahkan: <tool>: ({ data }) => <XxxResult data={data as XxxOutput} /> */
export const VIEWS: Record<string, (props: { data: unknown; input: Record<string, unknown> }) => React.ReactNode> = {
  promo: ({ data }) => <PromoResult data={data as PromoOutput} />,
  flow: ({ data }) => <FlowResult data={data as FlowOutput} />,
  loyalty: ({ data }) => <LoyaltyResult data={data as LoyaltyOutput} />,
};
