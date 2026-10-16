import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { addonInfo } from "@/lib/addons/catalog";

const schema = z.object({
  addon: z.string().max(40).optional(),
  plan: z.enum(["starter", "pro", "promax"]).optional(),
  note: z.string().max(500).optional(),
});

/** User minta upgrade paket (atau add-on lama) → masuk daftar "Calon pelanggan" di back office untuk di-follow-up tim. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { addon, plan, note } = parsed.data;
  if (addon ? !addonInfo(addon) : !plan) return jsonError(400, "invalid_body");
  const { error } = await s.supabase.from("waitlist").insert({
    user_id: s.user.id,
    email: s.profile.email ?? s.user.email ?? "",
    plan_interest: addon ? `addon:${addon}` : plan,
    note: note?.trim() || null,
  });
  if (error) return jsonError(400, "save_failed");
  return NextResponse.json({ ok: true });
}
