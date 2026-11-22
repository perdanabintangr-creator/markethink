import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContentAccess } from "@/lib/autopilot/content-access";
import { analyzeReferences } from "@/lib/autopilot/style-analyze";
import { parseDna } from "@/lib/autopilot/style";

export const maxDuration = 180;

const schema = z.object({
  attachmentIds: z.array(z.string().uuid()).min(1).max(10).optional(),
  /** Perbaiki gaya yang sudah ada dengan masukan (gambar referensi lama dipakai lagi). */
  styleId: z.string().uuid().optional(),
  feedback: z.string().trim().max(500).optional(),
  workspaceId: z.string().uuid().nullable().optional(),
});

/** Tahap 3: referensi desain pelanggan → analisis AI → DNA Gaya tersimpan (bisa diperbaiki dengan masukan). */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!(await getContentAccess(createAdminClient(), s.user.id, s.profile.role))) return jsonError(403, "plan");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.attachmentIds?.length && !parsed.data.styleId)) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("user", `autopilot-analyze:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const b = parsed.data;
  const admin = createAdminClient();

  let paths: string[] = [];
  let previous = null;
  let existingId: string | null = null;
  if (b.styleId) {
    const { data: st } = await s.supabase.from("brand_styles").select("id, dna, reference_paths").eq("id", b.styleId).maybeSingle();
    if (!st) return jsonError(404, "style_not_found");
    existingId = st.id as string;
    previous = parseDna(st.dna);
    paths = (st.reference_paths as string[]) ?? [];
  }
  if (b.attachmentIds?.length) {
    // RLS: hanya lampiran milik user; hanya gambar dari folder user sendiri.
    const { data: atts } = await s.supabase.from("attachments").select("storage_path, mime").in("id", b.attachmentIds);
    paths = (atts ?? []).filter((a) => String(a.mime).startsWith("image/")).map((a) => String(a.storage_path));
  }
  paths = paths.filter((p) => p.startsWith(`${s.user.id}/`) && !p.includes("..")).slice(0, 10);
  if (!paths.length) return jsonError(400, "no_images");

  const images = (
    await Promise.all(
      paths.map(async (p) => {
        const { data } = await admin.storage.from("uploads").download(p);
        return data ? { bytes: Buffer.from(await data.arrayBuffer()) as Buffer, mime: data.type || "image/jpeg" } : null;
      }),
    )
  ).flatMap((x) => (x ? [x] : []));
  if (!images.length) return jsonError(400, "no_images");

  try {
    const r = await analyzeReferences(admin, { userId: s.user.id, images, feedback: b.feedback, previous, en: s.profile.language === "en" });
    const row = {
      user_id: s.user.id,
      workspace_id: b.workspaceId ?? null,
      name: r.dna.name.slice(0, 60),
      source: "reference",
      dna: r.dna,
      reference_paths: paths,
      analysis: [r.analysis, r.limits ? `Catatan: ${r.limits}` : ""].filter(Boolean).join("\n"),
      feedback: b.feedback ?? null,
      updated_at: new Date().toISOString(),
    };
    const q = existingId
      ? admin.from("brand_styles").update(row).eq("id", existingId).eq("user_id", s.user.id)
      : admin.from("brand_styles").insert(row);
    const { data, error } = await q.select("id, name, dna, analysis, created_at").single();
    if (error) throw error;
    return NextResponse.json({ style: data });
  } catch (err) {
    console.error("[autopilot] analisis gaya gagal", err);
    return jsonError(502, "analysis_failed");
  }
}
