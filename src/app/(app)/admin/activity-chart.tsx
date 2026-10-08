/** Bar chart 1 seri (user aktif harian). Hover per bar menampilkan nilai; tabel tersedia di bawah. */
export function ActivityChart({ data }: { data: { day: string; active_users: number; messages: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.active_users));
  if (!data.length) return <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>;
  return (
    <div>
      <div className="flex h-40 items-end gap-[2px] border-b border-border/60" role="img" aria-label="User aktif harian">
        {data.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] bg-primary/80 transition-colors group-hover:bg-primary"
              style={{ height: `${Math.max(2, (d.active_users / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow group-hover:block">
              <div className="font-medium">{new Date(d.day).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</div>
              <div>{d.active_users} user · {d.messages} pesan</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{new Date(data[0].day).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
        <span>maks {max} user/hari</span>
        <span>{new Date(data[data.length - 1].day).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
      </div>
    </div>
  );
}
