import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCalendar } from "@/components/library/content-calendar";
import { requireUser } from "@/lib/auth";
import { collectPosts } from "@/lib/content-calendar";
import { libraryText } from "@/lib/i18n/library";

export const metadata = { title: "Kalender konten" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { supabase, profile } = await requireUser();
  const lang = profile.language === "en" ? "en" : "id";
  const t = libraryText(lang);

  // Semua hasil Kalender Konten (asal + revisi) — yang ditampilkan versi terbarunya saja.
  const { data } = await supabase
    .from("tool_runs")
    .select("id, revision_of, created_at, title, hidden, posts:output->posts")
    .eq("tool", "calendar")
    .eq("status", "ok")
    .order("created_at", { ascending: false })
    .limit(80);
  // Hasil yang disembunyikan user (beserta revisinya) tidak ikut tampil.
  const hiddenRoots = new Set((data ?? []).filter((r) => r.hidden && !r.revision_of).map((r) => r.id as string));
  const entries = collectPosts(
    (data ?? []).filter((r) => !r.hidden && !hiddenRoots.has((r.revision_of as string | null) ?? (r.id as string))).map((r) => ({
      id: r.id as string,
      revision_of: (r.revision_of as string | null) ?? null,
      created_at: r.created_at as string,
      title: (r.title as string | null) ?? null,
      output: { posts: (r as { posts?: unknown }).posts },
    })),
    t.calTitle,
  );
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:pt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.calTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.calSub}</p>
          </div>
          <Button asChild size="sm">
            <Link href="/tools/calendar">
              <CalendarPlus /> {t.makePlan}
            </Link>
          </Button>
        </div>
        {entries.length ? (
          <ContentCalendar lang={lang} entries={entries} today={today} />
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">{t.calEmpty}</p>
            <Button asChild className="mt-4">
              <Link href="/tools/calendar">
                <CalendarPlus /> {t.makePlan}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
