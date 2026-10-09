/**
 * Komponen grafik ringan untuk dashboard internal (tanpa library chart).
 * Satu seri per grafik (warna primer), batang tipis berujung bulat, tooltip saat hover, label teks memakai warna teks.
 */

export interface SeriesPoint {
  day: string;
  value: number;
}

const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

/** Batang harian (mis. pendaftar, user aktif, pesan, biaya). */
export function DailyBars({
  data,
  label,
  format = (v) => new Intl.NumberFormat("id-ID").format(v),
}: {
  data: SeriesPoint[];
  label: string;
  format?: (v: number) => string;
}) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Belum ada data.</p>;
  const max = Math.max(...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <figure>
      <div className="flex h-28 items-end gap-[2px] border-b border-border/70" role="img" aria-label={`${label}: total ${format(total)}`}>
        {data.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] bg-primary/75 transition-colors group-hover:bg-primary"
              style={{ height: max > 0 ? `${Math.max(d.value > 0 ? 3 : 0, (d.value / max) * 100)}%` : "0%" }}
            />
            <div className="pointer-events-none absolute -top-11 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow group-hover:block">
              <div className="font-medium">{shortDate(d.day)}</div>
              <div className="tabular-nums">{format(d.value)}</div>
            </div>
          </div>
        ))}
      </div>
      <figcaption className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{shortDate(data[0].day)}</span>
        <span>maks {format(max)}</span>
        <span>{shortDate(data[data.length - 1].day)}</span>
      </figcaption>
    </figure>
  );
}

/** Daftar batang horizontal untuk perbandingan besaran antar kategori. */
export function HBarList({
  items,
  format = (v) => new Intl.NumberFormat("id-ID").format(v),
  empty = "Belum ada data.",
}: {
  items: { label: string; value: number; sub?: string }[];
  format?: (v: number) => string;
  empty?: string;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 0);
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label} className="text-sm">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate">{i.label}</span>
            <span className="shrink-0 tabular-nums font-medium">
              {format(i.value)}
              {i.sub && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{i.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary/80" style={{ width: max > 0 ? `${Math.max(i.value > 0 ? 2 : 0, (i.value / max) * 100)}%` : "0%" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Funnel bertahap: lebar batang relatif ke tahap pertama + persentase konversi dari tahap sebelumnya. */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const first = steps[0]?.value || 0;
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1].value : s.value;
        const conv = prev > 0 ? Math.round((s.value / prev) * 100) : 0;
        return (
          <li key={s.label} className="text-sm">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span>
                <span className="mr-2 text-xs text-muted-foreground">{i + 1}.</span>
                {s.label}
              </span>
              <span className="tabular-nums font-medium">
                {new Intl.NumberFormat("id-ID").format(s.value)}
                {i > 0 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{conv}% dari tahap sebelumnya</span>}
              </span>
            </div>
            <div className="h-3 rounded-[4px] bg-muted">
              <div
                className="h-3 rounded-[4px] bg-primary/80"
                style={{ width: first > 0 ? `${Math.max(s.value > 0 ? 2 : 0, (s.value / first) * 100)}%` : "0%" }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
