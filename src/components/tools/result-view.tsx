"use client";

import type { AdsOutput, CompetitorOutput, KolOutput, ListingOutput, LiveOutput, WhatsappOutput } from "@/lib/addons/schemas";
import { ListingResult } from "./results/listing";
import { LiveResult } from "./results/live";
import { WhatsappResult } from "./results/whatsapp";
import { AdsResult } from "./results/ads";
import { CompetitorResult } from "./results/competitor";
import { KolResult } from "./results/kol";

export function ResultView({ tool, output, input }: { tool: string; output: unknown; input: Record<string, unknown> }) {
  switch (tool) {
    case "listing":
      return <ListingResult data={output as ListingOutput} />;
    case "live":
      return <LiveResult data={output as LiveOutput} />;
    case "whatsapp":
      return <WhatsappResult data={output as WhatsappOutput} />;
    case "ads":
      return <AdsResult data={output as AdsOutput} />;
    case "competitor":
      return <CompetitorResult data={output as CompetitorOutput} brand={String(input.brand ?? "Brand kamu")} />;
    case "kol":
      return <KolResult data={output as KolOutput} />;
  }
  return null;
}
