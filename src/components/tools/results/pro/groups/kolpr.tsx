"use client";

import type { KolreportOutput } from "@/lib/addons/pro/specs/kolreport";
import type { PressOutput } from "@/lib/addons/pro/specs/press";
import { KolreportResult } from "../kolreport";
import { PressResult } from "../press";

/** Halaman hasil tools kelompok "kolpr". Tambahkan: <tool>: ({ data }) => <XxxResult data={data as XxxOutput} /> */
export const VIEWS: Record<string, (props: { data: unknown; input: Record<string, unknown> }) => React.ReactNode> = {
  kolreport: ({ data, input }) => <KolreportResult data={data as KolreportOutput} objective={typeof input?.objective === "string" ? input.objective : undefined} />,
  press: ({ data }) => <PressResult data={data as PressOutput} />,
};
