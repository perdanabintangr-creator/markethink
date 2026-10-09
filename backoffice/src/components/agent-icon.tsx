import {
  Calendar,
  Clapperboard,
  FileText,
  Lightbulb,
  Map,
  Megaphone,
  MessageCircle,
  MessageSquare,
  PartyPopper,
  Presentation,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  Tags,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  clapperboard: Clapperboard,
  "file-text": FileText,
  lightbulb: Lightbulb,
  map: Map,
  megaphone: Megaphone,
  "message-circle": MessageCircle,
  "message-square": MessageSquare,
  "party-popper": PartyPopper,
  presentation: Presentation,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  star: Star,
  swords: Swords,
  tags: Tags,
  target: Target,
  users: Users,
};

export const AGENT_ICON_NAMES = Object.keys(ICONS);

export function AgentIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} />;
}
