"use client";

import type { CalendarOutput } from "@/lib/addons/pro/specs/calendar";
import type { ReportOutput } from "@/lib/addons/pro/specs/report";
import { CalendarResult } from "./calendar";
import { ReportResult } from "./report";
import { VIEWS as strategiViews } from "./groups/strategi";
import { VIEWS as kontenViews } from "./groups/konten";
import { VIEWS as crmViews } from "./groups/crm";
import { VIEWS as kolprViews } from "./groups/kolpr";

type View = (props: { data: unknown; input: Record<string, unknown> }) => React.ReactNode;

/** Halaman hasil Tools Pro per role. */
export const PRO_VIEWS: Record<string, View> = {
  calendar: ({ data }) => <CalendarResult data={data as CalendarOutput} />,
  report: ({ data }) => <ReportResult data={data as ReportOutput} />,
  ...strategiViews,
  ...kontenViews,
  ...crmViews,
  ...kolprViews,
};
