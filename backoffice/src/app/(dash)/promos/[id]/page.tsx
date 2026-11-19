import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { PROMO_SELECT, type PromoRow } from "@/lib/promos";
import { PromoEditor } from "./promo-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit promosi" };

export default async function PromoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { isOwner } = await requireBackoffice();
  if (!isOwner) redirect("/");
  const { id } = await params;
  if (id === "new") return <PromoEditor promo={null} />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await createAdminClient().from("promos").select(PROMO_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  return <PromoEditor promo={data as PromoRow} />;
}
