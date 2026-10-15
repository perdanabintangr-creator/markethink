import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_UPLOAD_BYTES } from "@/lib/files";

const MB = 1024 * 1024;

export interface StorageStatus {
  usedBytes: number;
  /** null = tanpa batas (admin). */
  limitBytes: number | null;
  fileMaxBytes: number;
}

/**
 * Kuota penyimpanan per paket (feature_flags `storage.max_mb`) & batas ukuran per file (`uploads.max_mb`).
 * Yang dihitung hanya file upload user (chat & dokumen project); file hasil buatan AI tidak dihitung.
 */
export async function getStorageStatus(supabase: SupabaseClient, profile: { id: string; role: string; plan_id: string }): Promise<StorageStatus> {
  const [{ data: flags }, { data: used }] = await Promise.all([
    supabase.from("feature_flags").select("key, value").eq("plan_id", profile.plan_id).in("key", ["storage", "uploads"]),
    createAdminClient().rpc("storage_used_bytes", { p_user: profile.id }),
  ]);
  const mb = (key: string) => Number((flags?.find((f) => f.key === key)?.value as { max_mb?: number } | null)?.max_mb ?? 0);
  const isAdmin = profile.role === "admin";
  const fileMb = mb("uploads");
  return {
    usedBytes: Number(used ?? 0),
    limitBytes: isAdmin || !mb("storage") ? null : mb("storage") * MB,
    fileMaxBytes: isAdmin || !fileMb ? MAX_UPLOAD_BYTES : Math.min(MAX_UPLOAD_BYTES, fileMb * MB),
  };
}

export const formatBytes = (b: number) =>
  b >= 1024 * MB ? `${(b / 1024 / MB).toLocaleString("id-ID", { maximumFractionDigits: 1 })} GB` : `${(b / MB).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
