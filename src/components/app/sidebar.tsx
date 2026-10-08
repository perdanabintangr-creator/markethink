"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bot,
  ChevronRight,
  Folder,
  FolderOpen,
  Languages,
  LogOut,
  MessageSquarePlus,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
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
import type { ChatSummary, WorkspaceSummary } from "@/lib/types";
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
  const { t, user, lang, workspaces } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const q = query.trim().toLowerCase();
  const matching = useMemo(() => (q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats), [chats, q]);
  const activeChat = chats.find((c) => pathname === `/chat/${c.id}`);

  // Project yang sedang dibuka otomatis terbuka di sidebar.
  useEffect(() => {
    const id = activeChat?.workspace_id;
    if (id) setExpanded((s) => (s.has(id) ? s : new Set(s).add(id)));
  }, [activeChat?.workspace_id]);

  const groups = useMemo(() => {
    // Chat di dalam project tampil di folder project-nya, bukan di riwayat umum.
    const list = matching.filter((c) => !c.workspace_id);
    const out: { label: string; items: ChatSummary[] }[] = [];
    for (const c of list) {
      const label = groupLabel(c.updated_at);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(c);
      else out.push({ label, items: [c] });
    }
    return out;
  }, [matching]);

  function toggleProject(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function newProject() {
    const name = window.prompt(t.newProjectPrompt)?.trim();
    if (!name) return;
    const res = await fetch("/api/workspaces", { method: "POST", body: JSON.stringify({ name }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return toast.error(
        data.error === "limit_reached"
          ? `Batas ${data.limit ?? ""} project untuk paket kamu sudah tercapai. Upgrade untuk menambah project.`
          : "Gagal membuat project.",
      );
    }
    setExpanded((s) => new Set(s).add(data.id));
    toast.success(`Project "${data.name}" dibuat`);
    onNavigate?.();
    router.push(`/chat?workspace=${data.id}`);
    router.refresh();
  }

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
        <div className="mb-3">
          <div className="flex items-center justify-between px-2 pb-1">
            <p className="text-xs font-medium text-muted-foreground">{t.projects}</p>
            <button
              onClick={newProject}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={t.newProject}
              title={t.newProject}
            >
              <Plus className="size-4" />
            </button>
          </div>
          {workspaces.map((w) => {
            const projectChats = matching.filter((c) => c.workspace_id === w.id);
            if (q && !projectChats.length && !w.name.toLowerCase().includes(q)) return null;
            return (
              <ProjectRow
                key={w.id}
                project={w}
                chats={projectChats}
                open={expanded.has(w.id) || (Boolean(q) && projectChats.length > 0)}
                onToggle={() => toggleProject(w.id)}
                pathname={pathname}
                onNavigate={onNavigate}
                onRename={rename}
                onRemove={remove}
              />
            );
          })}
          {!workspaces.length && (
            <button
              onClick={newProject}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            >
              <Plus className="size-4" /> {t.newProject}
            </button>
          )}
        </div>

        {loaded && !groups.length && <p className="px-2 py-4 text-sm text-muted-foreground">{t.noChats}</p>}
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{g.label}</p>
            {g.items.map((c) => (
              <ChatItem
                key={c.id}
                chat={c}
                active={pathname === `/chat/${c.id}`}
                onNavigate={onNavigate}
                onRename={rename}
                onRemove={remove}
              />
            ))}
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

function ProjectRow({
  project,
  chats,
  open,
  onToggle,
  pathname,
  onNavigate,
  onRename,
  onRemove,
}: {
  project: WorkspaceSummary;
  chats: ChatSummary[];
  open: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate?: () => void;
  onRename: (c: ChatSummary) => void;
  onRemove: (c: ChatSummary) => void;
}) {
  const { t } = useApp();
  const Icon = open ? FolderOpen : Folder;
  return (
    <div>
      <div className="group flex items-center rounded-lg hover:bg-accent">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-sm">
          <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
          <Icon className="size-4 shrink-0 text-primary" />
          <span className="truncate">{project.name}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="mr-1 rounded p-1 opacity-100 hover:bg-background md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label="Menu project"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/chat?workspace=${project.id}`} onClick={onNavigate}>
                <MessageSquarePlus /> {t.newChatInProject}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/workspaces/${project.id}`} onClick={onNavigate}>
                <Settings /> {t.projectSettings}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open && (
        <div className="mb-1 ml-4 border-l pl-1.5">
          <Link
            href={`/chat?workspace=${project.id}`}
            onClick={onNavigate}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="size-3.5" /> {t.newChatInProject}
          </Link>
          {chats.map((c) => (
            <ChatItem
              key={c.id}
              chat={c}
              active={pathname === `/chat/${c.id}`}
              onNavigate={onNavigate}
              onRename={onRename}
              onRemove={onRemove}
            />
          ))}
          {!chats.length && <p className="px-2 py-1 text-xs text-muted-foreground">{t.noProjectChats}</p>}
        </div>
      )}
    </div>
  );
}

function ChatItem({
  chat,
  active,
  onNavigate,
  onRename,
  onRemove,
}: {
  chat: ChatSummary;
  active: boolean;
  onNavigate?: () => void;
  onRename: (c: ChatSummary) => void;
  onRemove: (c: ChatSummary) => void;
}) {
  const { t } = useApp();
  return (
    <div className={cn("group flex items-center rounded-lg hover:bg-accent", active && "bg-accent")}>
      <Link href={`/chat/${chat.id}`} onClick={onNavigate} className="flex-1 truncate px-2 py-1.5 text-sm">
        {chat.title}
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
          <DropdownMenuItem onClick={() => onRename(chat)}>
            <Pencil /> {t.rename}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => onRemove(chat)}>
            <Trash2 /> {t.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
