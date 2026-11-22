import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCalendar } from "@/components/library/content-calendar";
import { requireUser } from "@/lib/auth";
import { autopilotEntries, collectPosts } from "@/lib/content-calendar";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContentAccess } from "@/lib/autopilot/content-access";
import { getContentOffers } from "@/lib/autopilot/content-offers";
import { ContentPackages } from "@/components/autopilot/content-packages";
import { libraryText } from "@/lib/i18n/library";

export const metadata = { title: "Kalender konten" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { supabase, profile } = await requireUser();
  const lang = profile.language === "en" ? "en" : "id";
  const t = libraryText(lang);

  // Kalender Konten termasuk Paket Autopilot Konten (bisa dibeli semua paket, termasuk Free).
  const admin = createAdminClient();
  const access = await getContentAccess(admin, profile.id, profile.role);
  if (!access) {
    const offers = await getContentOffers(admin);
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-8 px-4 pb-12 pt-8 sm:pt-12">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{t.calTitle}</h1>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
              {lang === "en"
                ? "Your content calendar fills itself with the Content Autopilot plan: weekly posts are planned, written, designed and scheduled for you."
                : "Kalender konten terisi otomatis dengan Paket Autopilot Konten: konten tiap minggu direncanakan, ditulis, didesain, dan dijadwalkan untukmu."}
            </p>
          </div>
          <ContentPackages lang={lang} plans={offers.plans} combos={offers.combos} current={null} heading={false} />
        </div>
      </div>
    );
  }

  // Semua hasil Kalender Konten (asal + revisi) — yang ditampilkan versi terbarunya saja.
  const [{ data }, { data: done }] = await Promise.all([
    supabase
      .from("tool_runs")
      .select("id, revision_of, created_at, title, hidden, posts:output->posts")
      .eq("tool", "calendar")
      .eq("status", "ok")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.from("content_posts_done").select("post_key").limit(2000),
  ]);
  const { data: apRows } = await supabase
    .from("social_posts")
    .select("id, post_date, post_time, kind, pillar, title, caption, status")
    .gte("post_date", new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10))
    .order("post_date")
    .limit(300);
  // Hasil yang disembunyikan user (beserta revisinya) tidak ikut tampil.
  const hiddenRoots = new Set(
    (data ?? [])
      .filter((r) => r.hidden && !r.revision_of)
      .map((r) => r.id as string),
  );
  const entries = collectPosts(
    (data ?? [])
      .filter(
        (r) =>
          !r.hidden &&
          !hiddenRoots.has(
            (r.revision_of as string | null) ?? (r.id as string),
          ),
      )
      .map((r) => ({
        id: r.id as string,
        revision_of: (r.revision_of as string | null) ?? null,
        created_at: r.created_at as string,
        title: (r.title as string | null) ?? null,
        output: { posts: (r as { posts?: unknown }).posts },
      })),
    t.calTitle,
  )
    .concat(autopilotEntries((apRows ?? []) as Parameters<typeof autopilotEntries>[0]))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:pt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t.calTitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.calSub}</p>
          </div>
          <Button asChild size="sm">
            <Link href="/tools/calendar">
              <CalendarPlus /> {t.makePlan}
            </Link>
          </Button>
        </div>
        {entries.length ? (
          <ContentCalendar
            lang={lang}
            entries={entries}
            today={today}
            posted={(done ?? []).map((d) => d.post_key as string)}
          />
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
