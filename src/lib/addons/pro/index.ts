import "server-only";
import type { z } from "zod";
import type { Runner } from "../tools";
import { calendarRunner } from "./defs/calendar";
import { reportRunner } from "./defs/report";
import { RUNNERS as strategiRunners } from "./groups/strategi.runners";
import { RUNNERS as kontenRunners } from "./groups/konten.runners";
import { RUNNERS as crmRunners } from "./groups/crm.runners";
import { RUNNERS as kolprRunners } from "./groups/kolpr.runners";

/** Runner semua Tools Pro per role (server). */
export const PRO_RUNNERS: Record<string, Runner<z.ZodTypeAny>> = {
  calendar: calendarRunner,
  report: reportRunner,
  ...strategiRunners,
  ...kontenRunners,
  ...crmRunners,
  ...kolprRunners,
};
