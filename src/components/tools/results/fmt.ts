/** Format angka/uang/tanggal hasil Tools Pro per bahasa. Versi "id" memakai formatter asli agar tampilan Indonesia tidak berubah. */
import type { Lang } from "@/lib/i18n/dict";
import { numID as numIDBase, rupiah as rupiahBase } from "@/lib/addons/format";
import { idr as idrBase } from "@/lib/addons/pro/specs/plan";
import { kolNum as kolNumBase, kolRp as kolRpBase, metricText as metricTextBase, type KolMetric } from "@/lib/addons/pro/specs/kolreport";
import { kpiValue as kpiValueBase, type ReportOutput } from "@/lib/addons/pro/specs/report";

type N = number | null | undefined;
const ok = (v: N): v is number => typeof v === "number" && Number.isFinite(v);

/** Rupiah ringkas (id): Rp1,2 jt / Rp15 rb. */
export const shortRpID = (v: N) => {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  const f = (x: number, d: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(x);
  if (Math.abs(v) >= 1e12) return `Rp${f(v / 1e12, 1)} T`;
  if (Math.abs(v) >= 1e9) return `Rp${f(v / 1e9, 1)} M`;
  if (Math.abs(v) >= 1e6) return `Rp${f(v / 1e6, 1)} jt`;
  if (Math.abs(v) >= 1e3) return `Rp${f(v / 1e3, 0)} rb`;
  return `Rp${f(v, 0)}`;
};

export const rpID = (n: N) => (!ok(n) ? "-" : `Rp${new Intl.NumberFormat("id-ID").format(Math.round(n))}`);
export const numIDk = (n: N, d = 0) => (!ok(n) ? "-" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(n));

const en = (x: number, d: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d }).format(x);
/** Rupiah ringkas (en): Rp1.2M / Rp15K / Rp3.4B. */
const shortRpEN = (v: N, kDigits = 0) => {
  if (!ok(v)) return "-";
  if (Math.abs(v) >= 1e12) return `Rp${en(v / 1e12, 1)}T`;
  if (Math.abs(v) >= 1e9) return `Rp${en(v / 1e9, 1)}B`;
  if (Math.abs(v) >= 1e6) return `Rp${en(v / 1e6, 1)}M`;
  if (Math.abs(v) >= 1e3) return `Rp${en(v / 1e3, kDigits)}K`;
  return `Rp${en(v, 0)}`;
};
const kolNumEN = (v: N) => (!ok(v) ? "-" : Math.abs(v) >= 1e6 ? `${en(v / 1e6, 1)}M` : Math.abs(v) >= 1e4 ? `${en(v / 1e3, 1)}K` : en(v, 0));

const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ID = {
  locale: "id-ID",
  /** Rp12.345 (null → "-"). */
  rupiah: rupiahBase,
  /** Angka dengan default 1 desimal (null → "-"). */
  numID: numIDBase,
  /** Rp12.345 (non-finite → "-"). */
  rp: rpID,
  /** Angka dengan default 0 desimal (non-finite → "-"). */
  num: numIDk,
  shortRp: shortRpID,
  idr: idrBase,
  kolRp: kolRpBase,
  kolNum: kolNumBase,
  metricText: metricTextBase,
  kpiValue: kpiValueBase,
  /** Angka bebas (toLocaleString). */
  n: (v: number, o?: Intl.NumberFormatOptions) => v.toLocaleString("id-ID", o),
  /** "2026-10-05" → "05/10". */
  dm: (s: string) => `${s.slice(8)}/${s.slice(5, 7)}`,
};

const EN: typeof ID = {
  locale: "en-US",
  rupiah: (n) => (n === null || n === undefined || Number.isNaN(n) ? "-" : `Rp${new Intl.NumberFormat("en-US").format(Math.round(n))}`),
  numID: (n, digits = 1) => (n === null || n === undefined || Number.isNaN(n) ? "-" : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n)),
  rp: (n) => (!ok(n) ? "-" : `Rp${new Intl.NumberFormat("en-US").format(Math.round(n))}`),
  num: (n, d = 0) => (!ok(n) ? "-" : en(n, d)),
  shortRp: (v) => shortRpEN(v),
  idr: (v) => shortRpEN(v),
  kolRp: (v) => shortRpEN(v, 1),
  kolNum: kolNumEN,
  metricText: (m: KolMetric, v: N) => {
    if (!ok(v)) return "-";
    if (m === "er") return `${en(v, 1)}%`;
    if (m === "roas") return `${en(v, 2)}x`;
    if (m === "views") return kolNumEN(v);
    return shortRpEN(v, 1);
  },
  kpiValue: (k: { unit: ReportOutput["kpis"][number]["unit"] }, v: N) => {
    if (!ok(v)) return "-";
    if (k.unit === "Rp") return shortRpEN(v);
    if (k.unit === "%") return `${en(v, 1)}%`;
    if (k.unit === "x") return `${en(v, 2)}x`;
    return en(v, 0);
  },
  n: (v, o) => v.toLocaleString("en-US", o),
  dm: (s) => `${MON_EN[Number(s.slice(5, 7)) - 1] ?? ""} ${Number(s.slice(8, 10))}`.trim(),
};

export type ResultFmt = typeof ID;
export const fmtFor = (lang: Lang): ResultFmt => (lang === "en" ? EN : ID);
