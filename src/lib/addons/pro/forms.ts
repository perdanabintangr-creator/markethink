import type { ToolForm } from "./fields";
import { calendarForm } from "./specs/calendar";
import { reportForm } from "./specs/report";
import { FORMS as strategiForms } from "./groups/strategi.forms";
import { FORMS as kontenForms } from "./groups/konten.forms";
import { FORMS as crmForms } from "./groups/crm.forms";
import { FORMS as kolprForms } from "./groups/kolpr.forms";

/** Form semua Tools Pro per role (aman untuk client). Tool lama memakai form khusus di tool-runner. */
export const PRO_FORMS: Record<string, ToolForm> = {
  calendar: calendarForm,
  report: reportForm,
  ...strategiForms,
  ...kontenForms,
  ...crmForms,
  ...kolprForms,
};
