import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAppUrl } from "@/lib/env";
import { canPublish, cleanIgCode, decryptToken, encryptToken, tokenKey } from "@/lib/instagram-core";

/**
 * Integrasi Instagram (Instagram API with Instagram Login): hubungkan akun Bisnis/Kreator pelanggan, simpan token
 * terenkripsi, perpanjang token, dan posting carousel / single image. Aktif bila INSTAGRAM_APP_ID & INSTAGRAM_APP_SECRET
 * diisi di Vercel (dari aplikasi Meta for Developers milik Marqthink).
 */

const GRAPH = `https://graph.instagram.com/${process.env.IG_GRAPH_VERSION?.trim() || "v23.0"}`;
export const IG_OAUTH_COOKIE = "mt_ig_oauth";
export const IG_OAUTH_COOKIE_PATH = "/api/instagram";

export const igEnabled = () => Boolean(process.env.INSTAGRAM_APP_ID?.trim() && process.env.INSTAGRAM_APP_SECRET?.trim());
export const igAppId = () => process.env.INSTAGRAM_APP_ID?.trim() ?? "";
export const igAppSecret = () => process.env.INSTAGRAM_APP_SECRET?.trim() ?? "";
const key = () => tokenKey(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");

export function igRedirectUri(origin?: string | null) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || origin?.replace(/\/$/, "") || resolveAppUrl();
  return `${base}/api/instagram/callback`;
}

export class IgError extends Error {
  constructor(
    message: string,
    public expired = false,
  ) {
    super(message);
  }
}

async function igFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* bukan JSON */
  }
  if (!res.ok || (data as { error?: unknown })?.error) {
    const err = (data as { error?: { message?: string; code?: number; error_subcode?: number } })?.error;
    const msg = `${res.status} ${err?.code ?? ""} ${err?.message ?? text.slice(0, 300)}`.trim();
    throw new IgError(msg, err?.code === 190);
  }
  return data as T;
}

const form = (o: Record<string, string>) => ({ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(o).toString() });

/** Tukar code → token jangka pendek → token jangka panjang (±60 hari) + profil. */
export async function connectInstagram(code: string, redirectUri: string) {
  const short = await igFetch<{ access_token: string; user_id: number | string; permissions?: string[] | string }>(
    "https://api.instagram.com/oauth/access_token",
    form({ client_id: igAppId(), client_secret: igAppSecret(), grant_type: "authorization_code", redirect_uri: redirectUri, code: cleanIgCode(code) }),
  );
  const long = await igFetch<{ access_token: string; expires_in: number }>(
    `https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: igAppSecret(), access_token: short.access_token })}`,
  );
  const me = await igFetch<{ user_id?: string; id?: string; username?: string; account_type?: string; profile_picture_url?: string }>(
    `${GRAPH}/me?${new URLSearchParams({ fields: "user_id,username,account_type,profile_picture_url", access_token: long.access_token })}`,
  );
  const perms = Array.isArray(short.permissions) ? short.permissions.join(",") : short.permissions ?? null;
  return { token: long.access_token, expiresIn: long.expires_in, igUserId: String(me.user_id ?? short.user_id), username: me.username ?? null, accountType: me.account_type ?? null, picture: me.profile_picture_url ?? null, scope: perms };
}

export async function saveInstagram(userId: string, c: Awaited<ReturnType<typeof connectInstagram>>) {
  const { error } = await createAdminClient()
    .from("instagram_accounts")
    .upsert({
      user_id: userId,
      ig_user_id: c.igUserId,
      username: c.username,
      account_type: c.accountType,
      picture_url: c.picture,
      token_enc: encryptToken(c.token, key()),
      token_expires_at: new Date(Date.now() + Math.max(3600, c.expiresIn || 0) * 1000).toISOString(),
      scope: c.scope,
      status: "active",
      last_error: null,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`simpan akun Instagram gagal: ${error.message}`);
}

export interface IgAccount {
  user_id: string;
  ig_user_id: string;
  username: string | null;
  account_type: string | null;
  picture_url: string | null;
  token_enc: string;
  token_expires_at: string;
  status: "active" | "expired" | "revoked";
  last_error: string | null;
}

export async function getInstagram(userId: string) {
  const { data } = await createAdminClient().from("instagram_accounts").select("*").eq("user_id", userId).maybeSingle<IgAccount>();
  return data ?? null;
}

/** Status untuk UI (tanpa token). */
export async function instagramStatus(userId: string) {
  const a = await getInstagram(userId);
  return {
    enabled: igEnabled(),
    connected: Boolean(a),
    username: a?.username ?? null,
    picture: a?.picture_url ?? null,
    status: a?.status ?? null,
    canPublish: a ? canPublish(a.account_type) : false,
    lastError: a?.last_error ?? null,
  };
}

export async function markInstagram(userId: string, status: IgAccount["status"], lastError: string | null) {
  await createAdminClient().from("instagram_accounts").update({ status, last_error: lastError, updated_at: new Date().toISOString() }).eq("user_id", userId);
}

/** Perpanjang token yang akan habis < 20 hari (dipanggil cron harian). */
export async function refreshInstagramTokens() {
  const admin = createAdminClient();
  const soon = new Date(Date.now() + 20 * 86_400_000).toISOString();
  const { data } = await admin.from("instagram_accounts").select("*").eq("status", "active").lt("token_expires_at", soon).limit(100);
  let ok = 0;
  for (const a of (data ?? []) as IgAccount[]) {
    try {
      const r = await igFetch<{ access_token: string; expires_in: number }>(
        `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: decryptToken(a.token_enc, key()) })}`,
      );
      await admin
        .from("instagram_accounts")
        .update({ token_enc: encryptToken(r.access_token, key()), token_expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", a.user_id);
      ok++;
    } catch (err) {
      const expired = err instanceof IgError && err.expired;
      if (expired || new Date(a.token_expires_at).getTime() < Date.now()) await markInstagram(a.user_id, "expired", "Akses kedaluwarsa, hubungkan ulang.");
      console.warn("[instagram] refresh gagal", a.user_id, String(err).slice(0, 200));
    }
  }
  return ok;
}

export async function disconnectInstagram(userId: string) {
  const admin = createAdminClient();
  await admin.from("instagram_accounts").delete().eq("user_id", userId);
  await admin.from("autopilot_settings").update({ auto_publish: false }).eq("user_id", userId);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFinished(id: string, token: string) {
  for (let k = 0; k < 20; k++) {
    const s = await igFetch<{ status_code?: string; status?: string }>(`${GRAPH}/${id}?${new URLSearchParams({ fields: "status_code,status", access_token: token })}`);
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new IgError(`container ${s.status_code}: ${s.status ?? ""}`);
    await wait(3000);
  }
  throw new IgError("container tidak selesai diproses");
}

/** Posting carousel (≥2 gambar) atau single image. `imageUrls` = URL JPEG publik sementara. */
export async function publishToInstagram(account: IgAccount, imageUrls: string[], caption: string) {
  const token = decryptToken(account.token_enc, key());
  const ig = account.ig_user_id;
  let creation: string;
  if (imageUrls.length > 1) {
    const children: string[] = [];
    for (const url of imageUrls.slice(0, 10)) {
      const c = await igFetch<{ id: string }>(`${GRAPH}/${ig}/media`, form({ image_url: url, is_carousel_item: "true", access_token: token }));
      children.push(c.id);
    }
    for (const c of children) await waitFinished(c, token);
    const parent = await igFetch<{ id: string }>(`${GRAPH}/${ig}/media`, form({ media_type: "CAROUSEL", children: children.join(","), caption, access_token: token }));
    creation = parent.id;
  } else {
    const c = await igFetch<{ id: string }>(`${GRAPH}/${ig}/media`, form({ image_url: imageUrls[0], caption, access_token: token }));
    creation = c.id;
  }
  await waitFinished(creation, token);
  const pub = await igFetch<{ id: string }>(`${GRAPH}/${ig}/media_publish`, form({ creation_id: creation, access_token: token }));
  let permalink: string | null = null;
  try {
    permalink = (await igFetch<{ permalink?: string }>(`${GRAPH}/${pub.id}?${new URLSearchParams({ fields: "permalink", access_token: token })}`)).permalink ?? null;
  } catch {
    /* tautan tidak wajib */
  }
  return { mediaId: pub.id, permalink };
}
