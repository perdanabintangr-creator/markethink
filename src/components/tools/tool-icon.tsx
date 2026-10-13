import { Calculator, MessageCircle, Radio, Stethoscope, Store, Telescope, Users, Wrench, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  listing: Store,
  live: Radio,
  whatsapp: MessageCircle,
  ads: Stethoscope,
  calc: Calculator,
  competitor: Telescope,
  kol: Users,
};

export function ToolIcon({ id, className }: { id: string; className?: string }) {
  const Icon = ICONS[id] ?? Wrench;
  return <Icon className={className} />;
}
