"use client";

import type { AdcopyOutput } from "@/lib/addons/pro/specs/adcopy";
import type { AuditOutput } from "@/lib/addons/pro/specs/audit";
import type { ScriptOutput } from "@/lib/addons/pro/specs/script";
import { AdcopyResult } from "../adcopy";
import { AuditResult } from "../audit";
import { ScriptResult } from "../script";

/** Halaman hasil tools kelompok "konten". Tambahkan: <tool>: ({ data }) => <XxxResult data={data as XxxOutput} /> */
export const VIEWS: Record<string, (props: { data: unknown; input: Record<string, unknown> }) => React.ReactNode> = {
  script: ({ data }) => <ScriptResult data={data as ScriptOutput} />,
  audit: ({ data }) => <AuditResult data={data as AuditOutput} />,
  adcopy: ({ data, input }) => <AdcopyResult data={data as AdcopyOutput} brand={String(input?.brand ?? "")} />,
};
