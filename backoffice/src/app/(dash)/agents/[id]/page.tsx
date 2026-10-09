import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import type { Agent } from "@/lib/types";
import { AgentEditor } from "./agent-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit agent" };

export default async function AgentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { isOwner } = await requireBackoffice();
  if (!isOwner) redirect("/");
  const { id } = await params;
  if (id === "new") return <AgentEditor agent={null} />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await createAdminClient().from("agents").select("*").eq("id", id).maybeSingle<Agent>();
  if (!data) notFound();
  return <AgentEditor agent={data} />;
}
