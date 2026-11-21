import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

/** Hapus gaya referensi milik user (gambar referensinya tetap ada sebagai lampiran). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError(400, "invalid_id");
  const { error } = await createAdminClient().from("brand_styles").delete().eq("id", id).eq("user_id", s.user.id);
  if (error) return jsonError(500, "delete_failed");
  return NextResponse.json({ ok: true });
}
