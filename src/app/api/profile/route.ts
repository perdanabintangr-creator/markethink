import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";

const schema = z.object({
  full_name: z.string().trim().max(80).optional(),
  language: z.enum(["id", "en"]).optional(),
});

export async function PATCH(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { error } = await s.supabase
    .from("profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", s.user.id);
  if (error) return jsonError(400, "update_failed");
  return NextResponse.json({ ok: true });
}
