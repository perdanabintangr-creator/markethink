import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { emails, sendEmail } from "@/lib/email";

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
  const { error } = await s.supabase.from("waitlist").insert({
    user_id: s.user.id,
    email: parsed.data.email,
    plan_interest: parsed.data.planInterest ?? "pro",
    note: parsed.data.note ?? null,
  });
  if (error) return jsonError(400, "save_failed");
  await sendEmail(parsed.data.email, "Kamu masuk waitlist Markethink Pro", emails.waitlist());
  return NextResponse.json({ ok: true });
}
