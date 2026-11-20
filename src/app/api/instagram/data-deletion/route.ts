import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { igAppSecret } from "@/lib/instagram";
import { parseSignedRequest } from "@/lib/instagram-core";

/** Permintaan hapus data dari Meta: hapus akun Instagram terhubung (token & profil) lalu beri kode konfirmasi. */
export async function POST(req: Request) {
  const body = await req.formData().catch(() => null);
  const data = parseSignedRequest(String(body?.get("signed_request") ?? ""), igAppSecret());
  if (!data?.user_id) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const admin = createAdminClient();
  const { data: rows } = await admin.from("instagram_accounts").delete().eq("ig_user_id", String(data.user_id)).select("user_id");
  const users = (rows ?? []).map((r) => r.user_id as string);
  if (users.length) await admin.from("autopilot_settings").update({ auto_publish: false }).in("user_id", users);
  const code = randomBytes(8).toString("hex");
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  return NextResponse.json({ url: `${origin}/data-deletion?code=${code}`, confirmation_code: code });
}
