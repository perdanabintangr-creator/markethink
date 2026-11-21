import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalAuthorized } from "@/lib/vault-auth";
import { fetchPublicImage, imageSearch } from "@/lib/autopilot/brand-research";
import { approveDna, generateBrandDna, loadOnboarding } from "@/lib/brand/server";
import { generateWeek } from "@/lib/autopilot/generate";
import { renderSlides } from "@/lib/autopilot/render";
import { renderOptions } from "@/lib/autopilot/media";
import type { Slide } from "@/lib/autopilot/slides";

export const maxDuration = 300;

/**
 * Uji end-to-end Brand Onboarding di production (internal, dipicu dari database):
 *  - mode "prepare": lengkapi aset uji (foto publik hasil riset sebagai foto asli + logo dari pencarian gambar publik)
 *    dan field wajib yang masih kosong;
 *  - mode "dna": riset + tim AI → Brand DNA (draf) → ACC;
 *  - mode "post": Autopilot asli (strategist → copywriter) membuat 1 carousel dari Brand DNA; tim senior & visual
 *    berjalan di latar belakang;
 *  - mode "sheet": render contact sheet post.
 */
export async function POST(req: Request) {
  if (!(await internalAuthorized(req))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { brand?: string; mode?: string; fields?: Record<string, string>; logoQuery?: string; postId?: string };
  const admin = createAdminClient();
  const { data: ws } = await admin.from("workspaces").select("id, user_id, name, brand_kit").ilike("name", String(body.brand ?? "Photobebaz")).limit(1).maybeSingle();
  if (!ws) return NextResponse.json({ ok: false, error: "workspace_not_found" }, { status: 404 });
  const userId = ws.user_id as string;
  const workspaceId = ws.id as string;

  if (body.mode === "prepare") {
    const steps: string[] = [];
    const kit = { ...((ws.brand_kit ?? {}) as Record<string, unknown>) };
    for (const [k, v] of Object.entries(body.fields ?? {})) if (typeof v === "string" && v.trim() && !String(kit[k] ?? "").trim()) kit[k] = v.trim();
    const { data: have } = await admin.from("brand_assets").select("kind").eq("workspace_id", workspaceId);
    const count = (k: string) => (have ?? []).filter((a) => a.kind === k).length;
    if (count("real_photo") < 3) {
      const { data: r } = await admin.from("brand_research").select("images").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const paths = ((r?.images ?? []) as { path: string | null }[]).map((i) => i.path).filter((p): p is string => Boolean(p && p.startsWith(`${userId}/`)));
      if (paths.length) await admin.from("brand_assets").insert(paths.slice(0, 10).map((p) => ({ user_id: userId, workspace_id: workspaceId, kind: "real_photo", storage_path: p, caption: "uji: foto publik hasil riset" })));
      steps.push(`foto asli (uji): ${paths.length}`);
    }
    if (count("logo") === 0) {
      const hits = await imageSearch(body.logoQuery ?? `${ws.name} logo`, 6);
      for (const h of hits) {
        const buf = await fetchPublicImage(h.url);
        if (!buf) continue;
        const png = await sharp(buf).resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        const path = `${userId}/brand/${workspaceId}/logo-${Date.now().toString(36)}.png`;
        const up = await admin.storage.from("uploads").upload(path, png, { contentType: "image/png", upsert: true });
        if (up.error) continue;
        const { data: att } = await admin.from("attachments").insert({ user_id: userId, storage_path: path, name: "logo.png", mime: "image/png", size: png.length }).select("id").single();
        await admin.from("brand_assets").insert({ user_id: userId, workspace_id: workspaceId, kind: "logo", storage_path: path, caption: `uji: logo publik (${h.source})` });
        if (att) kit.logo_id = att.id;
        steps.push(`logo (uji) dari ${h.source}: ${h.title.slice(0, 60)}`);
        break;
      }
    }
    await admin.from("workspaces").update({ brand_kit: kit }).eq("id", workspaceId);
    const o = await loadOnboarding(admin, userId, workspaceId);
    return NextResponse.json({ ok: true, steps, completeness: o?.completeness });
  }

  if (body.mode === "dna") {
    const started = Date.now();
    const res = await generateBrandDna(admin, { userId, workspaceId, en: false });
    await approveDna(admin, { userId, workspaceId, version: res.version });
    const { data: row } = await admin.from("brand_dna_versions").select("version, status, dna, cost_usd").eq("workspace_id", workspaceId).eq("version", res.version).single();
    return NextResponse.json({ ok: true, ms: Date.now() - started, researched: res.researched, ...row });
  }

  if (body.mode === "post") {
    const { data: prof } = await admin.from("profiles").select("plan_id, role, full_name").eq("id", userId).single();
    await admin.from("autopilot_settings").update({ workspace_id: workspaceId }).eq("user_id", userId);
    const res = await generateWeek(admin, { userId, planId: String(prof?.plan_id), role: String(prof?.role), language: "id", fullName: prof?.full_name as string | null, source: "manual", count: 1, skipIdeaReview: true });
    const { data: posts } = res.ok ? await admin.from("social_posts").select("id, title, kind, brand_dna_version, caption").eq("batch_id", res.batchId) : { data: null };
    return NextResponse.json({ ...res, posts });
  }

  if (body.mode === "sheet" && body.postId) {
    const { data: fin } = await admin.from("social_posts").select("id, user_id, workspace_id, kind, design, style, slides, caption, visual_plan, team_review, brand_dna_version").eq("id", body.postId).eq("user_id", userId).single();
    if (!fin) return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });
    const opts = await renderOptions(admin, fin as never, "id");
    const jpgs = await renderSlides((fin.slides ?? []) as Slide[], opts);
    const cw = 360;
    const ch = 450;
    const cols = 3;
    const rows = Math.ceil(jpgs.length / cols);
    const tiles = await Promise.all(jpgs.map((j) => sharp(j).resize(cw, ch).jpeg().toBuffer()));
    const sheet = await sharp({ create: { width: cols * cw + (cols - 1) * 8, height: rows * ch + (rows - 1) * 8, channels: 3, background: "#ffffff" } })
      .composite(tiles.map((t, k) => ({ input: t, left: (k % cols) * (cw + 8), top: Math.floor(k / cols) * (ch + 8) })))
      .jpeg({ quality: 78 })
      .toBuffer();
    return NextResponse.json({ ok: true, post: { ...fin, slides: undefined }, slides: fin.slides, sheet_b64: sheet.toString("base64") });
  }
  if (body.mode === "thumbs") {
    // Thumbnail aset onboarding (untuk screenshot halaman form di luar production).
    const { data: assets } = await admin.from("brand_assets").select("id, kind, storage_path").eq("workspace_id", workspaceId).order("created_at");
    const out: { id: string; kind: string; b64: string }[] = [];
    for (const a of assets ?? []) {
      const { data } = await admin.storage.from("uploads").download(String(a.storage_path));
      if (!data) continue;
      const jpg = await sharp(Buffer.from(await data.arrayBuffer())).resize({ width: 240, height: 240, fit: "inside" }).flatten({ background: "#ffffff" }).jpeg({ quality: 70 }).toBuffer();
      out.push({ id: a.id as string, kind: String(a.kind), b64: jpg.toString("base64") });
    }
    return NextResponse.json({ ok: true, thumbs: out });
  }
  return NextResponse.json({ ok: false, error: "mode" }, { status: 400 });
}
