import { Calculator, ClipboardList, Compass, PieChart, UserRound, MessageCircle, Radio, Stethoscope, Store, Telescope, Users, Wrench, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  listing: Store,
  live: Radio,
  whatsapp: MessageCircle,
  ads: Stethoscope,
  calc: Calculator,
  competitor: Telescope,
  kol: Users,
  sizing: PieChart,
  persona: UserRound,
  entry: Compass,
  survey: ClipboardList,
};

export function ToolIcon({ id, className }: { id: string; className?: string }) {
  const Icon = ICONS[id] ?? Wrench;
  return <Icon className={className} />;
}
