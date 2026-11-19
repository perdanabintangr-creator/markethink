import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { emails, sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email().max(200),
  planInterest: z.string().max(50).optional(),
  note: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("auth", `waitlist:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const { error } = await s.supabase.from("waitlist").insert({
    user_id: s.user.id,
    email: parsed.data.email,
    plan_interest: parsed.data.planInterest ?? "pro",
    note: parsed.data.note ?? null,
  });
  if (error) return jsonError(400, "save_failed");
  // Email konfirmasi hanya ke email akun sendiri (bukan alamat bebas dari form) — cegah domain kita dipakai untuk spam.
  if (s.profile.email) await sendEmail(s.profile.email, "Kamu masuk waitlist Marqthink Pro", emails.waitlist());
  return NextResponse.json({ ok: true });
}
