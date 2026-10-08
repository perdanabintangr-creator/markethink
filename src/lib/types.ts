import type { UIMessage } from "ai";
import type { TierId } from "@/lib/ai/models.config";

export interface MessageMeta {
  tier?: TierId;
  model?: string;
  createdAt?: number;
  credits?: number;
  remainingCredits?: number;
  inputTokens?: number;
  outputTokens?: number;
}

export type DataParts = {
  status: { state: "searching" | "reading" | "done"; label: string };
};

export type MtMessage = UIMessage<MessageMeta, DataParts>;

export interface ChatSummary {
  id: string;
  title: string;
  updated_at: string;
  workspace_id: string | null;
  share_token: string | null;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
}

export interface AgentField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  instructions: string;
  input_schema: AgentField[];
  default_tier: TierId;
  output_canvas: boolean;
  is_active: boolean;
  sort_order: number;
}

export const ATTACHMENT_URL_PREFIX = "attachment:";

export interface PendingAgentRun {
  text: string;
  agentId: string;
  agentName: string;
  tier: TierId;
  outputCanvas: boolean;
  workspaceId?: string | null;
}

export const PENDING_KEY = "mt_pending_run";
