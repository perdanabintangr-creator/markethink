import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { igAppSecret } from "@/lib/instagram";
import { parseSignedRequest } from "@/lib/instagram-core";

/** Callback Meta saat pengguna mencabut izin Marqthink dari Instagram: tandai dicabut & matikan posting otomatis. */
export async function POST(req: Request) {
  const body = await req.formData().catch(() => null);
  const data = parseSignedRequest(String(body?.get("signed_request") ?? ""), igAppSecret());
  if (!data?.user_id) return NextResponse.json({ ok: false }, { status: 400 });
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("instagram_accounts")
    .update({ status: "revoked", token_enc: "revoked", last_error: "Izin dicabut dari Instagram.", updated_at: new Date().toISOString() })
    .eq("ig_user_id", String(data.user_id))
    .select("user_id");
  const users = (rows ?? []).map((r) => r.user_id as string);
  if (users.length) await admin.from("autopilot_settings").update({ auto_publish: false }).in("user_id", users);
  return NextResponse.json({ ok: true });
}
