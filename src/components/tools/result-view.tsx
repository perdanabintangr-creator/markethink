"use client";

import type {
  AdsOutput,
  CompetitorOutput,
  EntryOutput,
  KolOutput,
  ListingOutput,
  LiveOutput,
  PersonaOutput,
  SizingOutput,
  SurveyOutput,
  WhatsappOutput,
} from "@/lib/addons/schemas";
import { ListingResult } from "./results/listing";
import { LiveResult } from "./results/live";
import { WhatsappResult } from "./results/whatsapp";
import { AdsResult } from "./results/ads";
import { CompetitorResult } from "./results/competitor";
import { KolResult } from "./results/kol";
import { SizingResult } from "./results/sizing";
import { PersonaResult } from "./results/persona";
import { EntryResult } from "./results/entry";
import { SurveyResult } from "./results/survey";
import { PRO_VIEWS } from "./results/pro";
import { useResultsI18n } from "./common";

export function ResultView({ tool, output, input }: { tool: string; output: unknown; input: Record<string, unknown> }) {
  const { t } = useResultsI18n();
  const Pro = PRO_VIEWS[tool];
  if (Pro) return <Pro data={output} input={input} />;
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
      return <CompetitorResult data={output as CompetitorOutput} brand={String(input.brand ?? t.competitor.defaultBrand)} />;
    case "kol":
      return <KolResult data={output as KolOutput} />;
    case "sizing":
      return <SizingResult data={output as SizingOutput} />;
    case "persona":
      return <PersonaResult data={output as PersonaOutput} />;
    case "entry":
      return <EntryResult data={output as EntryOutput} />;
    case "survey":
      return <SurveyResult data={output as SurveyOutput} />;
  }
  return null;
}
