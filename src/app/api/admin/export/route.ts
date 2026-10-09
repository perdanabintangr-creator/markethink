import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

/** Ekspor CSV untuk tim internal (khusus admin): daftar user atau waitlist. */
export async function GET(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (s.profile.role !== "admin") return jsonError(403, "forbidden");
  const type = new URL(req.url).searchParams.get("type");
  const admin = createAdminClient();

  let rows: Record<string, unknown>[] = [];
  if (type === "users") {
    const { data } = await admin
      .from("profiles")
      .select("email, full_name, plan_id, role, persona_role, industry, experience, goal, onboarded, banned, created_at, last_active_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    rows = data ?? [];
  } else if (type === "waitlist") {
    const { data } = await admin.from("waitlist").select("email, plan_interest, note, created_at").order("created_at", { ascending: false }).limit(10000);
    rows = data ?? [];
  } else {
    return jsonError(400, "invalid_type");
  }

  const headers = rows.length ? Object.keys(rows[0]) : ["kosong"];
  const cell = (v: unknown) => {
    const text = v === null || v === undefined ? "" : String(v);
    // Cegah formula injection di Excel/Sheets.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="markethink-${type}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
