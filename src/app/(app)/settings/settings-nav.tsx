import Link from "next/link";
import { Brain, FolderOpen, Gauge, HardDrive, Link2, Settings, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const SETTINGS_TABS = [
  { id: "umum", label: "Umum", icon: Settings },
  { id: "profil", label: "Profil & peran", icon: UserRound },
  { id: "personalisasi", label: "Personalisasi", icon: Sparkles },
  { id: "memori", label: "Memori", icon: Brain },
  { id: "project", label: "Brand & project", icon: FolderOpen },
  { id: "paket", label: "Paket & penggunaan", icon: Gauge },
  { id: "penyimpanan", label: "Penyimpanan", icon: HardDrive },
  { id: "link", label: "Link dibagikan", icon: Link2 },
  { id: "akun", label: "Akun & keamanan", icon: ShieldCheck },
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

export function settingsTabOf(v?: string): SettingsTab {
  return SETTINGS_TABS.find((t) => t.id === v)?.id ?? "umum";
}

/** Menu kiri (desktop) / deretan tab geser (HP), seperti pengaturan ChatGPT & Claude. */
export function SettingsNav({ active }: { active: SettingsTab }) {
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
      {SETTINGS_TABS.map((t) => (
        <Link
          key={t.id}
          href={`/settings?tab=${t.id}`}
          scroll={false}
          aria-current={t.id === active ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
            t.id === active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          <t.icon className="size-4" />
          {t.label}
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
