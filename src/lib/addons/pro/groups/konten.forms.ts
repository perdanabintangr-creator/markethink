import type { ToolForm } from "../fields";
import { adcopyForm } from "../specs/adcopy";
import { auditForm } from "../specs/audit";
import { scriptForm } from "../specs/script";

/** Form tools kelompok "konten" (aman untuk client). Tambahkan: <tool>: <tool>Form */
export const FORMS: Record<string, ToolForm> = {
  script: scriptForm,
  audit: auditForm,
  adcopy: adcopyForm,
};
