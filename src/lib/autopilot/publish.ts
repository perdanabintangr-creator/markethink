import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getInstagram, IgError, markInstagram, publishToInstagram } from "@/lib/instagram";
import { canPublish, igErrorText, isDue } from "@/lib/instagram-core";

export const MAX_PUBLISH_ATTEMPTS = 3;
const CLAIM_MS = 15 * 60_000;

interface DuePost {
  id: string;
  user_id: string;
  kind: string;
  caption: string;
  media: string[] | null;
  post_date: string;
  post_time: string;
  publish_attempts: number;
}

/**
 * Posting satu konten ke Instagram (dipakai cron & tombol "Posting sekarang"). Diklaim dulu agar tidak dobel.
 * Hasil: posted | retry | failed | skipped.
 */
export async function publishPost(admin: SupabaseClient, postId: string, opts: { force?: boolean } = {}) {
  const stale = new Date(Date.now() - CLAIM_MS).toISOString();
  const { data: claimed } = await admin
    .from("social_posts")
    .update({ publish_started_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("status", "approved")
    .or(`publish_started_at.is.null,publish_started_at.lt.${stale}`)
    .select("id, user_id, kind, caption, media, post_date, post_time, publish_attempts")
    .maybeSingle<DuePost>();
  if (!claimed) return { result: "skipped" as const, reason: "busy" };
  const p = claimed;
  const release = (patch: Record<string, unknown>) =>
    admin.from("social_posts").update({ publish_started_at: null, updated_at: new Date().toISOString(), ...patch }).eq("id", p.id);

  const account = await getInstagram(p.user_id);
  if (!account || account.status !== "active" || !canPublish(account.account_type)) {
    await release({});
    return { result: "skipped" as const, reason: "no_account" };
  }
  if (!opts.force && !isDue(p.post_date, p.post_time)) {
    await release({});
    return { result: "skipped" as const, reason: "not_due" };
  }
  const paths = (p.media ?? []).filter((x) => x.startsWith(`${p.user_id}/autopilot/`) && !x.includes(".."));
  if (!paths.length || p.kind === "reel") {
    await release({});
    return { result: "skipped" as const, reason: "no_media" };
  }

  const attempts = (p.publish_attempts ?? 0) + 1;
  try {
    const { data: signed, error } = await admin.storage.from("uploads").createSignedUrls(paths, 1800);
    if (error || !signed?.length) throw new Error(`signed url gagal: ${error?.message ?? "?"}`);
    const urls = signed.map((s) => s.signedUrl).filter(Boolean) as string[];
    const r = await publishToInstagram(account, urls, p.caption);
    await release({ status: "posted", posted_at: new Date().toISOString(), ig_media_id: r.mediaId, permalink: r.permalink, error: null, publish_attempts: attempts });
    await markInstagram(p.user_id, "active", null);
    return { result: "posted" as const, permalink: r.permalink };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[autopilot] posting IG gagal", p.id, raw.slice(0, 300));
    if (err instanceof IgError && err.expired) await markInstagram(p.user_id, "expired", igErrorText(raw));
    const final = attempts >= MAX_PUBLISH_ATTEMPTS || (err instanceof IgError && err.expired);
    await release({ status: final ? "failed" : "approved", error: `${igErrorText(raw)} [${raw.slice(0, 200)}]`, publish_attempts: attempts });
    return { result: final ? ("failed" as const) : ("retry" as const), error: igErrorText(raw) };
  }
}

/** Cari konten ACC yang jatuh tempo milik pelanggan dengan posting otomatis aktif, lalu posting (maks `limit`). */
export async function publishDue(admin: SupabaseClient, limit = 6, budgetMs = 240_000) {
  const started = Date.now();
  const { data: settings } = await admin.from("autopilot_settings").select("user_id").eq("auto_publish", true).limit(1000);
  const users = (settings ?? []).map((s) => s.user_id as string);
  if (!users.length) return { checked: 0, posted: 0 };
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const { data: rows } = await admin
    .from("social_posts")
    .select("id, post_date, post_time, publish_attempts")
    .eq("status", "approved")
    .in("user_id", users)
    .in("kind", ["carousel", "image"])
    .lte("post_date", today)
    .lt("publish_attempts", MAX_PUBLISH_ATTEMPTS)
    .order("post_date")
    .order("post_time")
    .limit(50);
  const due = (rows ?? []).filter((r) => isDue(String(r.post_date), String(r.post_time))).slice(0, limit);
  let posted = 0;
  for (const r of due) {
    if (Date.now() - started > budgetMs) break;
    const res = await publishPost(admin, r.id as string);
    if (res.result === "posted") posted++;
  }
  return { checked: due.length, posted };
}
