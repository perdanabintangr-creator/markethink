export type TierId = "junior" | "senior" | "associate" | "director";

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
