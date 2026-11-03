"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";

const keySchema = z.string().min(3).max(200).regex(/^[0-9a-f-]{36}:\d+@\d{4}-\d{2}-\d{2}$/);

/** Tandai / batalkan tanda "sudah diposting" untuk satu posting di Kalender konten. */
export async function setPosted(key: string, posted: boolean): Promise<{ ok: boolean }> {
  const parsed = keySchema.safeParse(key);
  if (!parsed.success) return { ok: false };
  const { supabase, user } = await requireUser();
  const { error } = posted
    ? await supabase.from("content_posts_done").upsert({ user_id: user.id, post_key: parsed.data }, { onConflict: "user_id,post_key", ignoreDuplicates: true })
    : await supabase.from("content_posts_done").delete().eq("user_id", user.id).eq("post_key", parsed.data);
  return { ok: !error };
}
