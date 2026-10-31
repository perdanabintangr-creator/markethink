import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAppUrl } from "@/lib/env";
import type { CanvaErrorCode, ConnectorStatus } from "@/lib/connectors/apps";
import {
  basicAuthHeader,
  buildAuthorizeUrl,
  canvaTitleBase64,
  codeChallengeS256,
  createCodeVerifier,
  createState,
  fitCanvaDimensions,
  sealOAuthCookie,
} from "@/lib/connectors/oauth";

/**
 * Konektor Canva (Canva Connect API). Sumber kebenaran endpoint & field: OpenAPI resmi
 * github.com/canva-sdks/canva-connect-api-starter-kit → openapi/spec.yml.
 *
 * Alur: OAuth Authorization Code + PKCE → token disimpan di user_connectors (hanya service role) →
 * PPT/PDF lewat Design Import job (POST /v1/imports, polling GET /v1/imports/{jobId});
 * gambar lewat Asset Upload job (POST /v1/asset-uploads, polling) lalu Create Design (POST /v1/designs, type_and_asset).
 */

export const CANVA_AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
const CANVA_API = "https://api.canva.com/rest";
/** Endpoint token/revoke: server utama di spec = /auth; /rest masih didukung (ditandai deprecated) sebagai cadangan. */
const CANVA_TOKEN_URLS = ["https://api.canva.com/auth/v1/oauth/token", "https://api.canva.com/rest/v1/oauth/token"];
const CANVA_REVOKE_URLS = ["https://api.canva.com/auth/v1/oauth/revoke", "https://api.canva.com/rest/v1/oauth/revoke"];

/**
 * Scope minimum:
 * - design:content:write → POST /v1/imports, GET /v1/imports/{jobId}, POST /v1/designs
 * - asset:write → POST /v1/asset-uploads; asset:read → GET /v1/asset-uploads/{jobId}
 * - profile:read → GET /v1/users/me/profile (nama akun di Pengaturan)
 */
export const CANVA_SCOPES = ["asset:read", "asset:write", "design:content:write", "profile:read"] as const;

export const CANVA_OAUTH_COOKIE = "mt_canva_oauth";
export const CANVA_OAUTH_COOKIE_PATH = "/api/connectors/canva";

/** Batas waktu menunggu job Canva selesai. */
const JOB_TIMEOUT_MS = 60_000;
/** Token dianggap kedaluwarsa bila sisa umurnya kurang dari ini. */
const REFRESH_BUFFER_MS = 5 * 60_000;

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const IMPORT_MIMES = new Set([PPTX_MIME, "application/vnd.ms-powerpoint", "application/pdf"]);
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

export const canvaEnabled = () => Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);

function credentials() {
  const clientId = process.env.CANVA_CLIENT_ID ?? "";
  const clientSecret = process.env.CANVA_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) throw new CanvaError("not_configured", "CANVA_CLIENT_ID / CANVA_CLIENT_SECRET belum diisi");
  return { clientId, clientSecret };
}

/** Kunci tanda tangan cookie OAuth (memakai client secret Canva; tidak pernah dikirim ke browser). */
export const canvaCookieSecret = () => process.env.CANVA_CLIENT_SECRET ?? "";

/** Redirect URI = `${NEXT_PUBLIC_APP_URL || origin}/api/connectors/canva/callback` (harus terdaftar persis di Canva Developer Portal). */
export function canvaRedirectUri(origin?: string | null) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || origin?.replace(/\/$/, "") || resolveAppUrl();
  return `${base}/api/connectors/canva/callback`;
}

export class CanvaError extends Error {
  constructor(
    public code: CanvaErrorCode,
    message?: string,
    public status?: number,
  ) {
    super(message ?? code);
    this.name = "CanvaError";
  }
}

// ─────────────────────────────── OAuth ───────────────────────────────

/** URL izin Canva + cookie bertanda tangan berisi state & code_verifier. */
export function startCanvaAuth(opts: { userId: string; returnPath: string; redirectUri: string }) {
  const { clientId } = credentials();
  const verifier = createCodeVerifier();
  const state = createState();
  const url = buildAuthorizeUrl({
    authorizeUrl: CANVA_AUTHORIZE_URL,
    clientId,
    redirectUri: opts.redirectUri,
    scopes: CANVA_SCOPES,
    state,
    codeChallenge: codeChallengeS256(verifier),
  });
  const cookie = sealOAuthCookie({ p: "canva", s: state, v: verifier, u: opts.userId, r: opts.returnPath }, canvaCookieSecret());
  return { url, cookie };
}

interface CanvaTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/** POST ke endpoint token (Basic auth, form urlencoded). Mencoba /auth lalu /rest bila 404. */
async function postOAuthForm(urls: string[], form: Record<string, string>) {
  const { clientId, clientSecret } = credentials();
  let last: Response | null = null;
  for (const url of urls) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { Authorization: basicAuthHeader(clientId, clientSecret), "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams(form).toString(),
        cache: "no-store",
      });
    } catch (err) {
      throw new CanvaError("network", `oauth: ${String(err)}`);
    }
    if (res.status !== 404) return res;
    last = res;
  }
  return last!;
}

async function requestToken(form: Record<string, string>): Promise<CanvaTokenResponse> {
  const res = await postOAuthForm(CANVA_TOKEN_URLS, form);
  const body = (await res.json().catch(() => null)) as (Partial<CanvaTokenResponse> & { error?: string; code?: string; message?: string; error_description?: string }) | null;
  if (!res.ok || !body?.access_token || !body.refresh_token) {
    const code = String(body?.error ?? body?.code ?? res.status);
    const desc = String(body?.error_description ?? body?.message ?? "").slice(0, 300);
    if (res.status === 429) throw new CanvaError("rate_limited", `token ${code}: ${desc}`, 429);
    if (res.status >= 500) throw new CanvaError("network", `token ${code}: ${desc}`, res.status);
    // invalid_grant / refresh token dicabut / client tidak valid → user perlu menghubungkan ulang.
    throw new CanvaError("needs_connect", `token ${code}: ${desc}`, res.status);
  }
  return body as CanvaTokenResponse;
}

export function exchangeCanvaCode(code: string, codeVerifier: string, redirectUri: string) {
  return requestToken({ grant_type: "authorization_code", code, code_verifier: codeVerifier, redirect_uri: redirectUri });
}

/** Nama akun Canva (GET /v1/users/me/profile, scope profile:read). Gagal → null. */
export async function fetchCanvaDisplayName(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${CANVA_API}/v1/users/me/profile`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { profile?: { display_name?: string } };
    return data.profile?.display_name?.slice(0, 120) || null;
  } catch {
    return null;
  }
}

export async function saveCanvaTokens(userId: string, tok: CanvaTokenResponse, accountName?: string | null) {
  const row: Record<string, unknown> = {
    user_id: userId,
    provider: "canva",
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: new Date(Date.now() + Math.max(60, Number(tok.expires_in) || 0) * 1000).toISOString(),
    scope: tok.scope ?? null,
    updated_at: new Date().toISOString(),
  };
  if (accountName !== undefined) row.account_name = accountName;
  const { error } = await createAdminClient().from("user_connectors").upsert(row, { onConflict: "user_id,provider" });
  if (error) throw new Error(`simpan token Canva gagal: ${error.message}`);
}

async function deleteCanvaRow(userId: string) {
  await createAdminClient().from("user_connectors").delete().eq("user_id", userId).eq("provider", "canva");
}

/**
 * Access token Canva yang masih berlaku untuk user ini (refresh otomatis bila hampir habis).
 * null = belum terhubung / refresh gagal (user perlu menghubungkan ulang).
 */
export async function getCanvaToken(userId: string, opts: { force?: boolean } = {}): Promise<string | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("user_connectors")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "canva")
    .maybeSingle();
  if (!row) return null;
  if (!opts.force && new Date(row.expires_at as string).getTime() - Date.now() > REFRESH_BUFFER_MS) return row.access_token as string;
  try {
    const tok = await requestToken({ grant_type: "refresh_token", refresh_token: row.refresh_token as string });
    await saveCanvaTokens(userId, tok);
    return tok.access_token;
  } catch (err) {
    if (err instanceof CanvaError && err.code === "needs_connect") {
      console.warn("[canva] refresh token ditolak, hapus koneksi", err.message);
      await deleteCanvaRow(userId);
      return null;
    }
    throw err;
  }
}

/** Putuskan Canva: cabut refresh token di Canva (sekaligus izin aplikasi), lalu hapus baris. */
export async function disconnectCanva(userId: string) {
  const { data: row } = await createAdminClient()
    .from("user_connectors")
    .select("refresh_token")
    .eq("user_id", userId)
    .eq("provider", "canva")
    .maybeSingle();
  if (row?.refresh_token && canvaEnabled()) {
    try {
      await postOAuthForm(CANVA_REVOKE_URLS, { token: row.refresh_token as string });
    } catch (err) {
      console.warn("[canva] revoke gagal (diabaikan)", String(err));
    }
  }
  await deleteCanvaRow(userId);
}

/** Status konektor untuk UI (tanpa token). */
export async function connectorStatuses(userId: string): Promise<ConnectorStatus[]> {
  const enabled = canvaEnabled();
  let row: { account_name: string | null } | null = null;
  if (enabled) {
    const { data } = await createAdminClient()
      .from("user_connectors")
      .select("account_name")
      .eq("user_id", userId)
      .eq("provider", "canva")
      .maybeSingle();
    row = (data as { account_name: string | null } | null) ?? null;
  }
  return [{ id: "canva", enabled, connected: Boolean(row), accountName: row?.account_name ?? null }];
}

// ─────────────────────────────── API ───────────────────────────────

interface CanvaApiError {
  code?: string;
  message?: string;
}

/** Panggil Canva API sebagai user; 401 → refresh paksa & ulang sekali. */
async function canvaFetch(userId: string, path: string, init: RequestInit): Promise<Response> {
  let token = await getCanvaToken(userId);
  if (!token) throw new CanvaError("needs_connect");
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${CANVA_API}${path}`, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch (err) {
      throw new CanvaError("network", `${path}: ${String(err)}`);
    }
    if (res.status === 401 && attempt === 0) {
      token = await getCanvaToken(userId, { force: true });
      if (!token) throw new CanvaError("needs_connect");
      continue;
    }
    if (!res.ok) throw await apiError(res, path);
    return res;
  }
  throw new CanvaError("needs_connect");
}

async function apiError(res: Response, path: string) {
  const body = (await res.json().catch(() => null)) as CanvaApiError | null;
  const code = body?.code ?? "";
  const detail = `${path} ${res.status} ${code}: ${String(body?.message ?? "").slice(0, 300)}`;
  if (res.status === 401 || ["invalid_access_token", "revoked_access_token", "missing_scope"].includes(code)) {
    return new CanvaError("needs_connect", detail, res.status);
  }
  if (res.status === 429 || code === "too_many_requests" || code === "quota_exceeded") return new CanvaError("rate_limited", detail, res.status);
  if (res.status === 413 || code === "request_too_large") return new CanvaError("file_too_big", detail, res.status);
  if (["invalid_file_format", "unsupported_content_type", "unsupported_asset"].includes(code)) return new CanvaError("unsupported_file", detail, res.status);
  if (res.status >= 500) return new CanvaError("network", detail, res.status);
  return new CanvaError("import_failed", detail, res.status);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Polling job asinkron Canva sampai success/failed atau batas waktu. */
async function pollJob<J extends { status: string }>(userId: string, path: string, first: J, deadline: number): Promise<J> {
  let job = first;
  let wait = 800;
  while (job.status === "in_progress") {
    if (Date.now() + wait > deadline) throw new CanvaError("timeout", `${path} masih in_progress`);
    await sleep(wait);
    wait = Math.min(3000, Math.round(wait * 1.5));
    const res = await canvaFetch(userId, path, { method: "GET" });
    job = ((await res.json()) as { job: J }).job;
  }
  return job;
}

interface DesignLinks {
  edit_url: string;
  view_url: string;
}
interface DesignImportJob {
  id: string;
  status: "in_progress" | "success" | "failed";
  result?: { designs: { id: string; title?: string; urls: DesignLinks }[] };
  error?: { code: string; message: string };
}
interface AssetUploadJob {
  id: string;
  status: "in_progress" | "success" | "failed";
  asset?: { id: string };
  error?: { code: string; message: string };
}

export type CanvaImportResult =
  | { ok: true; editUrl: string; viewUrl?: string; designId: string; title: string }
  | { ok: false; code: CanvaErrorCode; needsConnect?: true };

function jobErrorCode(code: string | undefined): CanvaErrorCode {
  if (code === "design_creation_throttled" || code === "design_import_throttled") return "rate_limited";
  if (code === "file_too_big") return "file_too_big";
  return "import_failed";
}

/** PPT/PPTX/PDF → desain Canva lewat Design Import job. */
async function importDesignFile(userId: string, bytes: Uint8Array, mime: string, title: string, deadline: number) {
  const res = await canvaFetch(userId, "/v1/imports", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Import-Metadata": JSON.stringify({ title_base64: canvaTitleBase64(title), mime_type: mime }),
    },
    body: new Uint8Array(bytes),
  });
  const created = ((await res.json()) as { job: DesignImportJob }).job;
  const job = await pollJob(userId, `/v1/imports/${encodeURIComponent(created.id)}`, created, deadline);
  if (job.status !== "success") throw new CanvaError(jobErrorCode(job.error?.code), `import ${job.error?.code}: ${job.error?.message ?? ""}`);
  const design = job.result?.designs?.[0];
  if (!design?.urls?.edit_url) throw new CanvaError("import_failed", "import sukses tanpa desain");
  return { designId: design.id, editUrl: design.urls.edit_url, viewUrl: design.urls.view_url };
}

/** Gambar → aset Canva (Asset Upload job) → desain baru seukuran gambar (Create Design, type_and_asset). */
async function importImage(userId: string, bytes: Uint8Array, mime: string, title: string, deadline: number) {
  const img = await normalizeImage(bytes, mime);
  const res = await canvaFetch(userId, "/v1/asset-uploads", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: canvaTitleBase64(title) }),
    },
    body: new Uint8Array(img.bytes),
  });
  const created = ((await res.json()) as { job: AssetUploadJob }).job;
  const job = await pollJob(userId, `/v1/asset-uploads/${encodeURIComponent(created.id)}`, created, deadline);
  if (job.status !== "success" || !job.asset?.id) throw new CanvaError(jobErrorCode(job.error?.code), `asset ${job.error?.code}: ${job.error?.message ?? ""}`);

  const size = fitCanvaDimensions(img.width, img.height);
  const designRes = await canvaFetch(userId, "/v1/designs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "type_and_asset",
      design_type: { type: "custom", width: size.width, height: size.height },
      asset_id: job.asset.id,
      title: Array.from(title).slice(0, 100).join("") || "Marqthink",
    }),
  });
  const design = ((await designRes.json()) as { design: { id: string; urls: DesignLinks } }).design;
  if (!design?.urls?.edit_url) throw new CanvaError("import_failed", "create design tanpa url");
  return { designId: design.id, editUrl: design.urls.edit_url, viewUrl: design.urls.view_url };
}

/** PNG/JPEG dikirim apa adanya; WebP/GIF diubah ke PNG. Ukuran asli untuk ukuran desain. */
async function normalizeImage(bytes: Uint8Array, mime: string) {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(Buffer.from(bytes)).metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = (rotated ? meta.height : meta.width) ?? 1080;
  const height = (rotated ? meta.width : meta.height) ?? 1080;
  if (mime === "image/png" || mime === "image/jpeg" || mime === "image/jpg") return { bytes, width, height };
  const png = await sharp(Buffer.from(bytes), { animated: false }).rotate().png().toBuffer();
  return { bytes: new Uint8Array(png), width, height };
}

export function canvaFileKind(mime: string): "design" | "image" | null {
  if (IMPORT_MIMES.has(mime)) return "design";
  if (IMAGE_MIMES.has(mime)) return "image";
  return null;
}

/** Kirim file ke akun Canva user sebagai desain yang bisa diedit. */
export async function importToCanva(userId: string, file: { bytes: Uint8Array; mime: string; title: string }): Promise<CanvaImportResult> {
  if (!canvaEnabled()) return { ok: false, code: "not_configured" };
  const kind = canvaFileKind(file.mime);
  if (!kind) return { ok: false, code: "unsupported_file" };
  const deadline = Date.now() + JOB_TIMEOUT_MS;
  try {
    const out =
      kind === "design"
        ? await importDesignFile(userId, file.bytes, file.mime, file.title, deadline)
        : await importImage(userId, file.bytes, file.mime, file.title, deadline);
    return { ok: true, ...out, title: file.title };
  } catch (err) {
    const code: CanvaErrorCode = err instanceof CanvaError ? err.code : "import_failed";
    console.error("[canva] import gagal", code, err instanceof Error ? err.message : String(err));
    if (code !== "needs_connect") await logCanvaError(userId, `${code}: ${err instanceof Error ? err.message : String(err)}`);
    return code === "needs_connect" ? { ok: false, code, needsConnect: true } : { ok: false, code };
  }
}

async function logCanvaError(userId: string, error: string) {
  try {
    await createAdminClient()
      .from("usage_logs")
      .insert({ user_id: userId, tier: "connector:canva", provider: "canva", credits: 0, est_cost_usd: 0, status: "error", error: error.slice(0, 1500) });
  } catch {
    // diagnosa saja; abaikan
  }
}

/**
 * Muat file milik user (cek kepemilikan: user_id harus sama) lalu kirim ke Canva.
 * Carousel (ZIP) otomatis memakai PDF pasangannya.
 */
export async function importAttachmentToCanva(userId: string, attachmentId: string, title?: string | null): Promise<CanvaImportResult> {
  if (!canvaEnabled()) return { ok: false, code: "not_configured" };
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("attachments")
    .select("id, name, mime, storage_path, created_at")
    .eq("id", attachmentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return { ok: false, code: "not_found" };

  let file = row as { id: string; name: string; mime: string; storage_path: string; created_at: string };
  if (file.mime === "application/zip" && /\.zip$/i.test(file.name)) {
    const pdfName = file.name.replace(/\.zip$/i, ".pdf");
    const near = (offsetMs: number) => new Date(new Date(file.created_at).getTime() + offsetMs).toISOString();
    const { data: pdf } = await admin
      .from("attachments")
      .select("id, name, mime, storage_path, created_at")
      .eq("user_id", userId)
      .eq("name", pdfName)
      .eq("mime", "application/pdf")
      .gte("created_at", near(-10 * 60_000))
      .lte("created_at", near(10 * 60_000))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!pdf) return { ok: false, code: "unsupported_file" };
    file = pdf as typeof file;
  }
  if (!canvaFileKind(file.mime)) return { ok: false, code: "unsupported_file" };

  const { data: blob, error } = await admin.storage.from("uploads").download(file.storage_path);
  if (error || !blob) return { ok: false, code: "not_found" };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const name = (title?.trim() || file.name.replace(/\.[a-z0-9]+$/i, "")).replace(/\s+/g, " ").slice(0, 100);
  return importToCanva(userId, { bytes, mime: file.mime, title: name || "Marqthink" });
}
