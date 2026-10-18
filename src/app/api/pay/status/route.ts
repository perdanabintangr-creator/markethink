import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncPayment } from "@/lib/payments/orders";

/** Status pembayaran milik user (dipanggil halaman setelah kembali dari Midtrans; ikut mengaktifkan bila notifikasi terlambat). */
export async function GET(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const orderId = new URL(req.url).searchParams.get("order") ?? "";
  const admin = createAdminClient();
  const { data: pay } = await admin.from("payments").select("order_id, user_id, item_name, status, fulfilled_at").eq("order_id", orderId).maybeSingle();
  if (!pay || pay.user_id !== s.user.id) return jsonError(404, "not_found");
  if (pay.fulfilled_at) return NextResponse.json({ status: "paid", item: pay.item_name });
  try {
    const status = await syncPayment(admin, orderId);
    return NextResponse.json({ status, item: pay.item_name });
  } catch {
    return NextResponse.json({ status: pay.status, item: pay.item_name });
  }
}
