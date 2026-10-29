"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, ChevronRight, FolderPlus, LayoutGrid, Menu, MessageSquarePlus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogoMark } from "@/components/logo";
import { crumbsFor } from "@/lib/breadcrumbs";
import { shellText } from "@/lib/i18n/shell";
import { workspaceUiText } from "@/lib/i18n/workspace-ui";
import { useApp } from "./app-context";
import { openCommandPalette } from "./command-palette";

/** Bar atas gaya aplikasi SaaS: breadcrumb, cari cepat (Ctrl+K) & tombol "Buat baru". Di HP juga membuka menu. */
export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { lang, workspaces } = useApp();
  const t = workspaceUiText(lang);
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname, t, lang, workspaces);

  return (
    <header className="flex h-12 shrink-0 items-center gap-1.5 border-b bg-background px-2 sm:px-3 print:hidden">
      <button onClick={onMenu} className="rounded-md p-1.5 hover:bg-accent md:hidden" aria-label={shellText(lang).openMenu}>
        <Menu className="size-5" />
      </button>
      <Link href="/dashboard" className="md:hidden" aria-label={t.dashboard}>
        <LogoMark className="size-6" gradientId="mt-logo-top" />
      </Link>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((c, i) => (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
            {c.href && i < crumbs.length - 1 ? (
              <Link href={c.href} className="hidden truncate text-muted-foreground hover:text-foreground sm:inline">
                {c.label}
              </Link>
            ) : (
              <span className={i === crumbs.length - 1 ? "truncate font-medium" : "hidden truncate text-muted-foreground sm:inline"}>{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex-1" />
      <button
        onClick={openCommandPalette}
        className="hidden h-8 w-56 items-center gap-2 rounded-lg border bg-muted/40 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted lg:flex"
      >
        <Search className="size-3.5" />
        {t.searchOrRun}
        <kbd className="ml-auto rounded border border-b-2 bg-background px-1 text-[10px]">Ctrl K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={openCommandPalette} aria-label={t.searchOrRun}>
        <Search />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-8">
            <Plus /> <span className="hidden sm:inline">{t.createNew}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href="/chat">
              <MessageSquarePlus /> {t.newChat}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/tools/agent">
              <BrainCircuit /> {t.agent}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/tools">
              <LayoutGrid /> {t.smartTools}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/workspaces">
              <FolderPlus /> {t.newProject}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
