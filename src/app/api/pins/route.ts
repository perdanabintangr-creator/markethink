import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), kind: z.enum(["chat", "run"]) })).max(50),
});

/** Simpan daftar "Disematkan" di sidebar (urutan = posisi). Item yang tidak ada di daftar dilepas sematannya. */
export async function PATCH(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const items = parsed.data.items;
  const admin = createAdminClient();

  // Lepas semua sematan lama milik user, lalu pasang urutan baru.
  const [a, b] = await Promise.all([
    s.supabase.from("chats").update({ pin_order: null }).not("pin_order", "is", null),
    admin.from("tool_runs").update({ pin_order: null }).eq("user_id", s.user.id).not("pin_order", "is", null),
  ]);
  if (a.error || b.error) return jsonError(400, "update_failed");
  const results = await Promise.all(
    items.map((it, i) =>
      it.kind === "chat"
        ? s.supabase.from("chats").update({ pin_order: i }).eq("id", it.id)
        : admin.from("tool_runs").update({ pin_order: i }).eq("id", it.id).eq("user_id", s.user.id),
    ),
  );
  if (results.some((r) => r.error)) return jsonError(400, "update_failed");
  return NextResponse.json({ ok: true });
}
