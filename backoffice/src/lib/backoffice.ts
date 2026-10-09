import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Login Back Office: akun username + password khusus tim bisnis, terpisah dari akun aplikasi (Supabase Auth).
 * Password di-hash scrypt; sesi = token acak di cookie httpOnly, yang disimpan di DB hanya hash-nya.
 */

export interface BackofficeUser {
  id: string;
  username: string;
  full_name: string;
  role: "owner" | "staff";
}

const COOKIE = "mt_bo_session";
const SESSION_DAYS = 7;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keylen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const normalizeUsername = (u: string) => u.trim().toLowerCase();
export const PASSWORD_MIN = 8;

/** Hash pembanding agar username yang tidak ada butuh waktu sama (tidak bisa ditebak dari kecepatan). */
let dummyHash: Promise<string> | null = null;

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginBackoffice(rawUsername: string, password: string): Promise<LoginResult> {
  const username = normalizeUsername(rawUsername);
  const admin = createAdminClient();
  const { data: user } = await admin
    .from("backoffice_users")
    .select("id, password_hash, active, failed_attempts, locked_until")
    .eq("username", username)
    .maybeSingle();

  if (!user) {
    dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
    await verifyPassword(password, await dummyHash);
    return { ok: false, error: "Username atau password salah." };
  }
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return { ok: false, error: `Akun dikunci sementara karena salah password ${MAX_FAILED}×. Coba lagi ${LOCK_MINUTES} menit lagi.` };
  }
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    const failed = user.failed_attempts + 1;
    const lock = failed >= MAX_FAILED;
    await admin
      .from("backoffice_users")
      .update({
        failed_attempts: lock ? 0 : failed,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", user.id);
    return { ok: false, error: lock ? `Salah password ${MAX_FAILED}×. Akun dikunci ${LOCK_MINUTES} menit.` : "Username atau password salah." };
  }
  if (!user.active) return { ok: false, error: "Akun ini sudah dinonaktifkan. Hubungi owner back office." };

  await admin
    .from("backoffice_users")
    .update({ failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", user.id);
  await createSession(user.id);
  return { ok: true };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const h = await headers();
  const admin = createAdminClient();
  await admin.from("backoffice_sessions").insert({
    user_id: userId,
    token_hash: sha256(token),
    expires_at: expires.toISOString(),
    user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  // Bersihkan sesi kedaluwarsa milik user ini.
  await admin.from("backoffice_sessions").delete().eq("user_id", userId).lt("expires_at", new Date().toISOString());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function logoutBackoffice() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await createAdminClient().from("backoffice_sessions").delete().eq("token_hash", sha256(token));
  store.delete(COOKIE);
}

/** Akun back office yang sedang login (atau null). */
export const getBackofficeUser = cache(async (): Promise<BackofficeUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("backoffice_sessions")
    .select("id, expires_at, last_seen_at, user:backoffice_users!inner(id, username, full_name, role, active)")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (!data) return null;
  const user = data.user as unknown as BackofficeUser & { active: boolean };
  if (!user?.active || new Date(data.expires_at).getTime() < Date.now()) return null;
  if (Date.now() - new Date(data.last_seen_at).getTime() > 10 * 60_000) {
    await admin.from("backoffice_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  }
  return { id: user.id, username: user.username, full_name: user.full_name, role: user.role };
});

/** Untuk halaman & aksi back office: wajib login akun back office. */
export async function requireBackoffice() {
  const user = await getBackofficeUser();
  if (!user) redirect("/login");
  return { user, isOwner: user.role === "owner" };
}

/**
 * Kode setup untuk membuat akun owner pertama — diisi founder sendiri di env Vercel `BACKOFFICE_SETUP_CODE`
 * (bukan di kode / chat). Dibandingkan dengan waktu konstan.
 */
export function setupCodeConfigured() {
  return (process.env.BACKOFFICE_SETUP_CODE ?? "").trim().length >= 8;
}
export function verifySetupCode(code: string) {
  const expected = (process.env.BACKOFFICE_SETUP_CODE ?? "").trim();
  if (expected.length < 8) return false;
  const a = Buffer.from(sha256(code.trim()));
  const b = Buffer.from(sha256(expected));
  return timingSafeEqual(a, b);
}

/** Ada owner aktif? Bila tidak ada (awal pemakaian), admin aplikasi boleh membuat owner lewat /backoffice/setup. */
export async function hasActiveOwner() {
  const { count } = await createAdminClient()
    .from("backoffice_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("active", true);
  return (count ?? 0) > 0;
}

/** Keluarkan semua sesi user (setelah ganti/reset password atau dinonaktifkan), kecuali sesi saat ini bila diminta. */
export async function revokeSessions(userId: string, keepCurrent = false) {
  const admin = createAdminClient();
  let q = admin.from("backoffice_sessions").delete().eq("user_id", userId);
  if (keepCurrent) {
    const token = (await cookies()).get(COOKIE)?.value;
    if (token) q = q.neq("token_hash", sha256(token));
  }
  await q;
}
