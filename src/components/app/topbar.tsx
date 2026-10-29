"use client";

import Link from "next/link";
import { Menu, Search, SquarePen } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { shellText } from "@/lib/i18n/shell";
import { workspaceUiText } from "@/lib/i18n/workspace-ui";
import { useApp } from "./app-context";
import { openCommandPalette } from "./command-palette";

/** Bar atas khusus HP: buka menu, logo, cari & chat baru. Di laptop semuanya ada di sidebar. */
export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { lang } = useApp();
  const t = workspaceUiText(lang);

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b bg-background px-2 md:hidden print:hidden">
      <button onClick={onMenu} className="rounded-md p-1.5 hover:bg-accent" aria-label={shellText(lang).openMenu}>
        <Menu className="size-5" />
      </button>
      <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold" aria-label={t.dashboard}>
        <LogoMark className="size-6" gradientId="mt-logo-top" />
        Markethink
      </Link>
      <div className="flex-1" />
      <button onClick={openCommandPalette} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t.searchOrRun}>
        <Search className="size-5" />
      </button>
      <Link href="/chat" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t.newChat}>
        <SquarePen className="size-5" />
      </Link>
    </header>
  );
}
