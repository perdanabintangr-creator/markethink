import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { Agent } from "@/lib/types";
import { AgentForm } from "./agent-form";

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("agents")
    .select("id, slug, name, description, icon, category, input_schema, default_tier, output_canvas")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) notFound();
  return <AgentForm agent={data as Omit<Agent, "instructions" | "is_active" | "sort_order">} />;
}
