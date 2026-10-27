import type { Lang } from "./dict";

/** Teks tombol ekspor & simulator hasil Smart Tools. ID + EN. */
const id = {
  toCalendar: "Tambah ke Google Calendar",
  toCalendarHint: "Unduh file .ics, lalu buka Google Calendar → Setelan → Impor. Bisa juga dibuka di iPhone/Outlook.",
  csv: "Unduh CSV",
  adsCsv: "Unduh CSV iklan",
  adsCsvHint: "Untuk diunggah massal / dibagikan ke tim: Meta Ads Manager, Google Ads Editor, atau Google Sheets.",
  simTitle: "🎛️ Simulator target penjualan",
  simHint: "Geser angkanya, hasil langsung dihitung ulang (tanpa memotong kuota).",
  share: "Target pangsa pasar (dari SAM)",
  price: "Harga rata-rata per transaksi",
  growth: "Pertumbuhan pasar per tahun",
  perYear: "Omzet target per tahun",
  perMonth: "Omzet target per bulan",
  txMonth: "Transaksi per bulan",
  txDay: "Transaksi per hari",
  in3y: "Omzet di tahun ke-3",
  sam: "SAM (pasar yang bisa dilayani)",
};

const en: typeof id = {
  toCalendar: "Add to Google Calendar",
  toCalendarHint: "Download the .ics file, then open Google Calendar → Settings → Import. Also works on iPhone/Outlook.",
  csv: "Download CSV",
  adsCsv: "Download ads CSV",
  adsCsvHint: "For bulk upload / sharing with your team: Meta Ads Manager, Google Ads Editor, or Google Sheets.",
  simTitle: "🎛️ Sales target simulator",
  simHint: "Drag the numbers and the results update instantly (no quota used).",
  share: "Target market share (of SAM)",
  price: "Average price per transaction",
  growth: "Market growth per year",
  perYear: "Target revenue per year",
  perMonth: "Target revenue per month",
  txMonth: "Transactions per month",
  txDay: "Transactions per day",
  in3y: "Revenue in year 3",
  sam: "SAM (serviceable market)",
};

export const exportsText = (lang: Lang | null | undefined) => (lang === "en" ? en : id);

/** Unduh teks sebagai file (di browser). */
export function downloadText(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
