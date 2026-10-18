import Link from "next/link";
import { Blocks, Brain, FolderOpen, Gauge, HardDrive, Link2, Settings, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n/dict";
import { settingsText } from "@/lib/i18n/settings";

export const SETTINGS_TABS = [
  { id: "umum", icon: Settings },
  { id: "profil", icon: UserRound },
  { id: "personalisasi", icon: Sparkles },
  { id: "memori", icon: Brain },
  { id: "project", icon: FolderOpen },
  { id: "aplikasi", icon: Blocks },
  { id: "paket", icon: Gauge },
  { id: "penyimpanan", icon: HardDrive },
  { id: "link", icon: Link2 },
  { id: "akun", icon: ShieldCheck },
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

export function settingsTabOf(v?: string): SettingsTab {
  return SETTINGS_TABS.find((t) => t.id === v)?.id ?? "umum";
}

/** Menu kiri (desktop) / deretan tab geser (HP), seperti pengaturan ChatGPT & Claude. */
export function SettingsNav({ active, lang }: { active: SettingsTab; lang: Lang }) {
  const t = settingsText(lang);
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
      {SETTINGS_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/settings?tab=${tab.id}`}
          scroll={false}
          aria-current={tab.id === active ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
            tab.id === active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          <tab.icon className="size-4" />
          {t.tabs[tab.id]}
        </Link>
      ))}
    </nav>
  );
}

/** Satu baris pengaturan: judul + keterangan di kiri, kontrol di kanan. */
export function SettingRow({ title, desc, children }: { title: string; desc?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
