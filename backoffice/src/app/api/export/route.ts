import { getBackofficeUser } from "@/lib/backoffice";
import { createAdminClient } from "@/lib/supabase/admin";

const jsonError = (status: number, error: string) => Response.json({ error }, { status });

const PLAN: Record<string, string> = { beta: "Free", pro: "Pro", promax: "Promax" };

/** Ekspor CSV (bisa dibuka di Excel/Sheets) untuk tim back office: pelanggan, penjualan, atau waitlist. */
export async function GET(req: Request) {
  if (!(await getBackofficeUser())) return jsonError(401, "unauthorized");
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const admin = createAdminClient();

  let rows: Record<string, unknown>[] = [];
  if (type === "customers") {
    const status = url.searchParams.get("status") ?? "all";
    const { data } = await admin.rpc("bo_customer_list", {
      p_search: url.searchParams.get("q") || null,
      p_plan: url.searchParams.get("plan") || null,
      p_status: status,
      p_sort: url.searchParams.get("sort") ?? "newest",
      p_limit: 500,
      p_offset: 0,
    });
    rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      email: r.email,
      nama: r.full_name,
      paket: PLAN[String(r.plan_id)] ?? r.plan_id,
      di_paket_sejak: r.plan_started_at,
      aktif_sampai: r.active_until,
      pertama_bayar: r.first_paid_at,
      total_bayar_rp: r.total_paid,
      jumlah_bayar: r.payments,
      tim_internal: r.internal ? "ya" : "",
      daftar: r.created_at,
      terakhir_aktif: r.last_active_at,
    }));
  } else if (type === "sales") {
    const month = url.searchParams.get("month");
    let q = admin
      .from("subscriptions")
      .select("paid_at, plan_id, months, kind, amount_idr, payment_method, current_period_start, current_period_end, refunded_at, note, customer:profiles!subscriptions_user_id_fkey(email, full_name)")
      .order("paid_at", { ascending: false })
      .limit(10000);
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      q = q.gte("paid_at", new Date(Date.UTC(y, m - 1, 1, -7)).toISOString()).lt("paid_at", new Date(Date.UTC(y, m, 1, -7)).toISOString());
    }
    const { data } = await q;
    rows = (data ?? []).map((s) => {
      const c = s.customer as unknown as { email: string | null; full_name: string | null } | null;
      return {
        tanggal_bayar: s.paid_at,
        email: c?.email,
        nama: c?.full_name,
        paket: PLAN[s.plan_id] ?? s.plan_id,
        durasi_bulan: s.months,
        jenis: s.kind,
        nominal_rp: s.amount_idr,
        metode: s.payment_method,
        mulai: s.current_period_start,
        sampai: s.current_period_end,
        dibatalkan: s.refunded_at ? "ya" : "",
        catatan: s.note,
      };
    });
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
