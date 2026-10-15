import type { ToolForm } from "../fields";
import { kolreportForm } from "../specs/kolreport";
import { pressForm } from "../specs/press";

/** Form tools kelompok "kolpr" (aman untuk client). Tambahkan: <tool>: <tool>Form */
export const FORMS: Record<string, ToolForm> = {
  kolreport: kolreportForm,
  press: pressForm,
};
