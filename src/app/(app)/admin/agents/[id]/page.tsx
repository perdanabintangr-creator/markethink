import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgentEditor } from "./agent-editor";

export default async function AdminAgentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return <AgentEditor agent={null} />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await createAdminClient().from("agents").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <AgentEditor agent={data} />;
}
