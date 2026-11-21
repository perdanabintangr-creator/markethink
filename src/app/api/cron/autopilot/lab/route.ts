import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalAuthorized } from "@/lib/vault-auth";
import { directVisuals } from "@/lib/autopilot/finish";
import { renderSlides } from "@/lib/autopilot/render";
import { renderOptions } from "@/lib/autopilot/media";
import { activeStyle } from "@/lib/autopilot/styles-server";
import { baseOf, LOOK_DNA } from "@/lib/autopilot/style";
import { latestResearch, researchBrand } from "@/lib/autopilot/brand-research";
import type { Slide } from "@/lib/autopilot/slides";

export const maxDuration = 300;

/**
 * Uji Visual Director di production (internal, dipicu dari database): satu carousel contoh untuk brand tertentu →
 * riset brand (bila belum) → rencana visual → gambar BARU via API → render → contact sheet. Hasil disimpan sebagai
 * draf berlabel [Tes] agar founder bisa melihatnya di aplikasi.
 */
export async function POST(req: Request) {
  if (!(await internalAuthorized(req))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { brand?: string; innerCap?: number };
  const admin = createAdminClient();
  const { data: ws } = await admin.from("workspaces").select("id, user_id, name").ilike("name", String(body.brand ?? "Photobebaz")).limit(1).maybeSingle();
  if (!ws) return NextResponse.json({ ok: false, error: "workspace_not_found" }, { status: 404 });
  const userId = ws.user_id as string;
  const steps: string[] = [];
  if (!(await latestResearch(admin, userId, ws.id as string))) {
    try {
      await researchBrand(admin, { userId, workspaceId: ws.id as string, en: false });
      steps.push("riset brand: ok");
    } catch (err) {
      steps.push(`riset brand gagal: ${String(err).slice(0, 120)}`);
    }
  }
  const dna = (await activeStyle(admin, userId)) ?? LOOK_DNA.photo;
  const slides: Slide[] = [
    { type: "cover", label: "tips foto", title: "Foto bareng kaku?", accent: "Coba 3 trik ini.", sub: "Biar hasil photobox kamu lebih natural & akrab." },
    { type: "point", label: "TRIK #1", num: "01", title: "Berdiri rapat,", accent: "badan sedikit miring", body: "Jangan berjejer lurus kayak antre. Rapatkan bahu dan miringkan badan ke tengah." },
    { type: "point", label: "TRIK #2", num: "02", title: "Hadap ke", accent: "sumber cahaya", body: "Wajah menghadap lampu supaya terang. Jangan membelakangi cahaya." },
    { type: "point", label: "TRIK #3", num: "03", title: "Pose sambil", accent: "bergerak", body: "Ngobrol, tertawa, atau rangkul teman. Gerakan kecil bikin ekspresi lebih santai." },
    { type: "list", label: "RANGKUMAN", title: "3 trik *simpel*", items: ["Berdiri rapat & miring", "Hadap ke cahaya", "Pose sambil bergerak"] },
    { type: "cta", title: "Simpan dulu,", accent: "praktikkan di booth.", sub: "Ajak geng kamu foto bareng minggu ini.", button: "Follow @photobebaz" },
  ];
  const id = randomUUID();
  const { error } = await admin.from("social_posts").insert({
    id,
    user_id: userId,
    workspace_id: ws.id,
    batch_id: randomUUID(),
    post_date: new Date(Date.now() + 7 * 3_600_000 + 2 * 86_400_000).toISOString().slice(0, 10),
    post_time: "19:00",
    kind: "carousel",
    design: baseOf(dna),
    style: dna,
    title: "[Tes Visual Director] Foto bareng kaku? Coba 3 trik ini",
    pillar: "Edukasi",
    slides,
    caption: "Foto bareng kaku? Coba 3 trik simpel ini biar hasil photobox kamu lebih natural.\n\nSimpan dulu, praktikkan bareng geng kamu.\n\n#photobox #fotobareng #Photobebaz",
    note: "Konten uji Visual Director (boleh ditolak).",
    status: "draft",
    team_review: { skipped: true },
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const { data: row } = await admin.from("social_posts").select("id, user_id, workspace_id, kind, design, style, product_id, pillar, title, slides, caption, script, status").eq("id", id).single();
  const results = await directVisuals(admin, userId, [row as never], { innerCap: Number(body.innerCap ?? 3), budgetMs: 200_000 });
  const { data: fin } = await admin.from("social_posts").select("id, user_id, workspace_id, kind, design, style, slides, visual_plan").eq("id", id).single();
  const opts = await renderOptions(admin, fin as never, "id");
  const jpgs = await renderSlides((fin?.slides ?? []) as Slide[], opts);
  // Contact sheet 3 kolom (360×450 per slide).
  const cw = 360;
  const ch = 450;
  const cols = 3;
  const rows = Math.ceil(jpgs.length / cols);
  const tiles = await Promise.all(jpgs.map((j) => sharp(j).resize(cw, ch).jpeg().toBuffer()));
  const sheet = await sharp({ create: { width: cols * cw + (cols - 1) * 8, height: rows * ch + (rows - 1) * 8, channels: 3, background: "#ffffff" } })
    .composite(tiles.map((t, k) => ({ input: t, left: (k % cols) * (cw + 8), top: Math.floor(k / cols) * (ch + 8) })))
    .jpeg({ quality: 78 })
    .toBuffer();
  await admin.storage.from("uploads").upload(`${userId}/autopilot/${id}/contact-sheet.jpg`, sheet, { contentType: "image/jpeg", upsert: true });
  return NextResponse.json({ ok: true, postId: id, steps, results, visual_plan: fin?.visual_plan ?? null, sheet_b64: sheet.toString("base64") });
}
