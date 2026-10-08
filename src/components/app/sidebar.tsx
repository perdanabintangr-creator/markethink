"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bot,
  Briefcase,
  Languages,
  LogOut,
  MessageSquarePlus,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Search,
  Settings,
  Shield,
  Sun,
  Trash2,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHATS_CHANGED, emitChatsChanged } from "@/lib/events";
import type { ChatSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp } from "./app-context";
import { CreditMeter } from "./credit-meter";

function groupLabel(date: string) {
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return "Hari ini";
  if (days < 2) return "Kemarin";
  if (days < 7) return "7 hari terakhir";
  if (days < 30) return "30 hari terakhir";
  return "Lebih lama";
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t, user, lang } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/chats");
    if (res.ok) setChats((await res.json()).chats);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(CHATS_CHANGED, load);
    return () => window.removeEventListener(CHATS_CHANGED, load);
  }, [load]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats;
    const out: { label: string; items: ChatSummary[] }[] = [];
    for (const c of list) {
      const label = groupLabel(c.updated_at);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(c);
      else out.push({ label, items: [c] });
    }
    return out;
  }, [chats, query]);

  async function rename(chat: ChatSummary) {
    const title = window.prompt(t.rename, chat.title)?.trim();
    if (!title || title === chat.title) return;
    await fetch(`/api/chats/${chat.id}`, { method: "PATCH", body: JSON.stringify({ title }) });
    emitChatsChanged();
  }

  async function remove(chat: ChatSummary) {
    if (!window.confirm(`Hapus chat "${chat.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    await fetch(`/api/chats/${chat.id}`, { method: "DELETE" });
    toast.success("Chat dihapus");
    emitChatsChanged();
    if (pathname === `/chat/${chat.id}`) router.push("/chat");
  }

  async function setLanguage(next: "id" | "en") {
    await fetch("/api/profile", { method: "PATCH", body: JSON.stringify({ language: next }) });
    router.refresh();
  }

  const nav = [
    { href: "/agents", label: t.agents, icon: Bot },
    { href: "/workspaces", label: t.workspaces, icon: Briefcase },
  ];

  return (
    <div className="flex h-full flex-col gap-3 bg-muted/40 p-3">
      <div className="flex items-center justify-between px-1">
        <Logo href="/chat" />
      </div>
      <Button asChild className="w-full justify-start" onClick={onNavigate}>
        <Link href="/chat">
          <MessageSquarePlus /> {t.newChat}
        </Link>
      </Button>
      <nav className="space-y-0.5">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent",
              pathname.startsWith(n.href) && "bg-accent font-medium",
            )}
          >
            <n.icon className="size-4" /> {n.label}
          </Link>
        ))}
      </nav>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchChats} className="h-9 pl-8" />
      </div>

      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        {loaded && !groups.length && <p className="px-2 py-4 text-sm text-muted-foreground">{t.noChats}</p>}
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{g.label}</p>
            {g.items.map((c) => {
              const active = pathname === `/chat/${c.id}`;
              return (
                <div
                  key={c.id}
                  className={cn("group flex items-center rounded-lg hover:bg-accent", active && "bg-accent")}
                >
                  <Link href={`/chat/${c.id}`} onClick={onNavigate} className="flex-1 truncate px-2 py-1.5 text-sm">
                    {c.title}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="mr-1 rounded p-1 opacity-100 hover:bg-background md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
                        aria-label="Menu chat"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => rename(c)}>
                        <Pencil /> {t.rename}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => remove(c)}>
                        <Trash2 /> {t.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <CreditMeter />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-2 text-left hover:bg-accent">
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                (user.name ?? user.email ?? "?").charAt(0).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.name ?? "User"}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuItem asChild>
            <Link href="/settings" onClick={onNavigate}>
              <Settings /> {t.settings}
            </Link>
          </DropdownMenuItem>
          {user.role === "admin" && (
            <DropdownMenuItem asChild>
              <Link href="/admin" onClick={onNavigate}>
                <Shield /> {t.admin}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t.theme}</DropdownMenuLabel>
          <div className="flex gap-1 px-2 pb-1">
            <Button variant="outline" size="icon" onClick={() => setTheme("light")} aria-label="Light">
              <Sun />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setTheme("dark")} aria-label="Dark">
              <Moon />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setTheme("system")} aria-label="System">
              <Monitor />
            </Button>
          </div>
          <DropdownMenuItem onClick={() => setLanguage(lang === "id" ? "en" : "id")}>
            <Languages /> {t.language}: {lang === "id" ? "Indonesia → English" : "English → Indonesia"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action="/auth/signout" method="post">
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
              <LogOut className="size-4" /> {t.logout}
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
