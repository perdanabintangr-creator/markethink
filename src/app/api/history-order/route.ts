import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ id: z.string().uuid(), kind: z.enum(["chat", "run"]), sort_key: z.number().finite() });

/** Simpan posisi baru satu item riwayat setelah digeser (angka urut di antara dua tetangganya). */
export async function PATCH(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { id, kind, sort_key } = parsed.data;
  const { error } =
    kind === "chat"
      ? await s.supabase.from("chats").update({ sort_key }).eq("id", id)
      : await createAdminClient().from("tool_runs").update({ sort_key }).eq("id", id).eq("user_id", s.user.id);
  if (error) return jsonError(400, "update_failed");
  return NextResponse.json({ ok: true });
}
