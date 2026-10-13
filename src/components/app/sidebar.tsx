"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bot,
  Wrench,
  ChevronRight,
  Folder,
  FolderInput,
  FolderOpen,
  LayoutGrid,
  Languages,
  Loader2,
  LogOut,
  MessageSquarePlus,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHATS_CHANGED, emitChatsChanged } from "@/lib/events";
import type { ChatSummary, ToolRunSummary, WorkspaceSummary } from "@/lib/types";
import { ToolIcon } from "@/components/tools/tool-icon";
import { MENU_GROUPS, TOOLS, toolInfo } from "@/lib/addons/catalog";

/** Item riwayat: chat biasa atau hasil Tools Pro (punya `toolRun`). */
type HistoryItem = ChatSummary & { toolRun?: { tool: string } };

const runToItem = (r: ToolRunSummary): HistoryItem => ({
  id: r.id,
  title: r.title || toolInfo(r.tool)?.name || "Tools Pro",
  updated_at: r.created_at,
  workspace_id: null,
  share_token: null,
  toolRun: { tool: r.tool },
});
const itemHref = (c: HistoryItem) => (c.toolRun ? `/tools/${c.toolRun.tool}/${c.id}` : `/chat/${c.id}`);
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
  const [runs, setRuns] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Urutan project lokal (langsung berubah saat di-drag, lalu disimpan ke server).
  const [order, setOrder] = useState<string[] | null>(null);
  const projects = useMemo(() => {
    if (!order) return workspaces;
    const byId = new Map(workspaces.map((w) => [w.id, w]));
    const known = order.map((id) => byId.get(id)).filter((w): w is WorkspaceSummary => Boolean(w));
    return [...workspaces.filter((w) => !order.includes(w.id)), ...known];
  }, [workspaces, order]);

  const load = useCallback(async () => {
    const res = await fetch("/api/chats");
    if (res.ok) {
      const data = await res.json();
      setChats(data.chats);
      setRuns(((data.toolRuns ?? []) as ToolRunSummary[]).map(runToItem));
    }
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
    const runMatches = q ? runs.filter((r) => r.title.toLowerCase().includes(q)) : runs;
    const list: HistoryItem[] = [...matching.filter((c) => !c.workspace_id), ...runMatches].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
    const out: { label: string; items: HistoryItem[] }[] = [];
    for (const c of list) {
      const label = groupLabel(c.updated_at);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(c);
      else out.push({ label, items: [c] });
    }
    return out;
  }, [matching, runs, q]);

  function toggleProject(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Geser dengan mouse (pointer events, bukan drag bawaan browser yang sering tidak jalan pada link).
  const [drag, setDrag] = useState<{ kind: "chat" | "project"; id: string; title: string; x: number; y: number; over: string | null } | null>(null);
  const dragRef = useRef<{ kind: "chat" | "project"; id: string; title: string; x0: number; y0: number; active: boolean } | null>(null);

  function startDrag(e: React.PointerEvent, kind: "chat" | "project", id: string, title: string) {
    // Sentuhan (HP) memakai menu ⋯ → "Pindahkan ke project", agar tidak bentrok dengan scroll.
    if (e.pointerType === "touch" || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    dragRef.current = { kind, id, title, x0: e.clientX, y0: e.clientY, active: false };
    const targetAt = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-project-id]");
      const over = el?.dataset.projectId ?? null;
      return over && over !== id ? over : null;
    };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.active) {
        if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 6) return;
        d.active = true;
        document.body.classList.add("select-none", "cursor-grabbing");
      }
      setDrag({ kind, id, title, x: ev.clientX, y: ev.clientY, over: targetAt(ev.clientX, ev.clientY) });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      document.body.classList.remove("select-none", "cursor-grabbing");
      if (!d?.active) return;
      // Setelah menggeser, jangan sampai klik ikut membuka chat / menutup folder.
      const block = (ce: MouseEvent) => {
        ce.preventDefault();
        ce.stopPropagation();
      };
      window.addEventListener("click", block, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", block, { capture: true }), 50);
      const target = ev.type === "pointerup" ? targetAt(ev.clientX, ev.clientY) : null;
      if (!target) return;
      if (kind === "chat") void moveChat(id, target);
      else void moveProject(id, target);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  /** Pindahkan chat umum ke dalam project (drag & drop atau menu). */
  async function moveChat(chatId: string, projectId: string) {
    const chat = chats.find((c) => c.id === chatId);
    const project = workspaces.find((w) => w.id === projectId);
    if (!chat || !project || chat.workspace_id === projectId) return;
    if (chat.workspace_id) return void toast.error("Chat yang sudah berisi percakapan di project tidak bisa dipindah.");
    setChats((list) => list.map((c) => (c.id === chatId ? { ...c, workspace_id: projectId } : c)));
    setExpanded((s) => new Set(s).add(projectId));
    const res = await fetch(`/api/chats/${chatId}`, { method: "PATCH", body: JSON.stringify({ workspace_id: projectId }) });
    if (!res.ok) {
      toast.error("Gagal memindahkan chat. Coba lagi.");
    } else {
      toast.success(`Dipindah ke project "${project.name}"`);
    }
    emitChatsChanged();
  }

  /** Geser project ke posisi project lain. */
  async function moveProject(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    const ids = projects.map((w) => w.id).filter((id) => id !== dragId);
    const from = projects.findIndex((w) => w.id === dragId);
    const to = projects.findIndex((w) => w.id === targetId);
    ids.splice(ids.indexOf(targetId) + (from < to ? 1 : 0), 0, dragId);
    setOrder(ids);
    const res = await fetch("/api/workspaces/order", { method: "PATCH", body: JSON.stringify({ ids }) });
    if (!res.ok) {
      toast.error("Gagal menyimpan urutan project.");
      setOrder(null);
    } else {
      router.refresh();
    }
  }

  // Jendela isian di dalam aplikasi (bukan pop-up browser) untuk project baru, ganti nama, dan hapus chat.
  const [dlg, setDlg] = useState<
    { kind: "newProject" } | { kind: "rename"; chat: HistoryItem } | { kind: "delete"; chat: HistoryItem } | null
  >(null);
  const [dlgValue, setDlgValue] = useState("");
  const [dlgError, setDlgError] = useState<string | null>(null);
  const [dlgBusy, setDlgBusy] = useState(false);

  function openDialog(next: NonNullable<typeof dlg>) {
    setDlg(next);
    setDlgError(null);
    setDlgBusy(false);
    setDlgValue(next.kind === "rename" ? next.chat.title : "");
  }

  const newProject = () => openDialog({ kind: "newProject" });
  const rename = (chat: HistoryItem) => openDialog({ kind: "rename", chat });
  const remove = (chat: HistoryItem) => openDialog({ kind: "delete", chat });

  async function submitDialog(e?: React.FormEvent) {
    e?.preventDefault();
    if (!dlg || dlgBusy) return;
    setDlgBusy(true);
    setDlgError(null);
    try {
      if (dlg.kind === "newProject") {
        const name = dlgValue.trim();
        if (!name) return setDlgError(t.newProjectPrompt);
        const res = await fetch("/api/workspaces", { method: "POST", body: JSON.stringify({ name }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return setDlgError(
            data.error === "limit_reached"
              ? `Batas ${data.limit ?? ""} project untuk paket kamu sudah tercapai. Upgrade untuk menambah project.`
              : "Gagal membuat project. Coba lagi.",
          );
        }
        setDlg(null);
        setExpanded((s) => new Set(s).add(data.id));
        toast.success(`Project "${data.name}" dibuat`);
        onNavigate?.();
        router.push(`/chat?workspace=${data.id}`);
        router.refresh();
      } else if (dlg.kind === "rename") {
        const title = dlgValue.trim();
        if (!title) return;
        if (title !== dlg.chat.title) {
          const url = dlg.chat.toolRun ? `/api/tools/runs/${dlg.chat.id}` : `/api/chats/${dlg.chat.id}`;
          await fetch(url, { method: "PATCH", body: JSON.stringify({ title }) });
          emitChatsChanged();
        }
        setDlg(null);
      } else {
        const chat = dlg.chat;
        await fetch(chat.toolRun ? `/api/tools/runs/${chat.id}` : `/api/chats/${chat.id}`, { method: "DELETE" });
        setDlg(null);
        toast.success(chat.toolRun ? "Hasil disembunyikan dari riwayat" : "Chat dihapus");
        emitChatsChanged();
        if (pathname === itemHref(chat)) router.push(chat.toolRun ? "/tools" : "/chat");
      }
    } finally {
      setDlgBusy(false);
    }
  }

  async function setLanguage(next: "id" | "en") {
    await fetch("/api/profile", { method: "PATCH", body: JSON.stringify({ language: next }) });
    router.refresh();
  }


  return (
    <div className="flex h-full flex-col gap-3 bg-muted/40 p-3">
      {drag && (
        <div
          className="pointer-events-none fixed z-[100] flex max-w-60 items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-sm shadow-lg"
          style={{ left: drag.x + 12, top: drag.y + 8 }}
        >
          {drag.kind === "project" ? <Folder className="size-4 text-primary" /> : <MessageSquarePlus className="size-4 text-muted-foreground" />}
          <span className="truncate">{drag.title}</span>
          {drag.over && <span className="ml-1 shrink-0 text-xs text-primary">{drag.kind === "chat" ? "→ masukkan" : "↕ pindah"}</span>}
        </div>
      )}
      <div className="flex items-center justify-between px-1">
        <Logo href="/chat" />
      </div>
      <Button asChild className="w-full justify-start" onClick={onNavigate}>
        <Link href="/chat">
          <MessageSquarePlus /> {t.newChat}
        </Link>
      </Button>
      <nav className="space-y-0.5">
        <ToolsMenu pathname={pathname} onNavigate={onNavigate} />
        <Link
          href="/agents"
          onClick={onNavigate}
          className={cn("flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent", pathname.startsWith("/agents") && "bg-accent font-medium")}
        >
          <Bot className="size-4" /> {t.agents}
        </Link>
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
          {projects.map((w) => {
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
                onDragStart={(e) => startDrag(e, "project", w.id, w.name)}
                dropTarget={drag?.over === w.id}
                dragging={drag?.kind === "project" && drag.id === w.id}
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
                active={pathname === itemHref(c)}
                onNavigate={onNavigate}
                onRename={rename}
                onRemove={remove}
                projects={c.toolRun ? undefined : projects}
                onMove={(projectId) => moveChat(c.id, projectId)}
                onDragStart={(e) => startDrag(e, "chat", c.id, c.title)}
                dragging={drag?.kind === "chat" && drag.id === c.id}
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

      <Dialog open={dlg !== null} onOpenChange={(open) => !open && setDlg(null)}>
        <DialogContent>
          {dlg?.kind === "delete" ? (
            <>
              <DialogHeader>
                <DialogTitle>{dlg.chat.toolRun ? "Sembunyikan dari riwayat?" : "Hapus chat?"}</DialogTitle>
                <DialogDescription>
                  {dlg.chat.toolRun
                    ? `"${dlg.chat.title}" tidak tampil lagi di riwayat sidebar. Hasilnya tetap bisa dibuka dari halaman tool-nya.`
                    : `Chat "${dlg.chat.title}" akan dihapus permanen dan tidak bisa dikembalikan.`}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDlg(null)}>{t.cancel}</Button>
                <Button variant="destructive" onClick={() => submitDialog()} disabled={dlgBusy}>
                  {dlgBusy && <Loader2 className="animate-spin" />} {t.delete}
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={submitDialog} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{dlg?.kind === "rename" ? t.rename : t.newProject}</DialogTitle>
                {dlg?.kind === "newProject" && (
                  <DialogDescription>
                    Satu project untuk satu brand/klien. Chat, Brand Kit, dokumen, dan memory di dalamnya terpisah dari
                    project lain.
                  </DialogDescription>
                )}
              </DialogHeader>
              <Input
                autoFocus
                value={dlgValue}
                onChange={(e) => setDlgValue(e.target.value)}
                maxLength={dlg?.kind === "rename" ? 120 : 80}
                placeholder={dlg?.kind === "rename" ? "Judul chat" : "Mis. Kopi Tuku, Photobebaz, Klien ABC"}
              />
              {dlgError && <p className="text-sm text-destructive">{dlgError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDlg(null)}>{t.cancel}</Button>
                <Button type="submit" disabled={dlgBusy || !dlgValue.trim()}>
                  {dlgBusy && <Loader2 className="animate-spin" />}
                  {dlg?.kind === "rename" ? "Simpan" : "Buat project"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const TOOLS_OPEN_KEY = "mt_tools_menu_open";

/** Menu "Tools Pro" yang bisa dibuka-tutup: submenu per kelompok (Market Research, Jualan Online, Iklan). */
function ToolsMenu({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { t } = useApp();
  const inTools = pathname.startsWith("/tools");
  const [open, setOpen] = useState(inTools);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOOLS_OPEN_KEY);
      if (saved !== null) setOpen(saved === "1" || inTools);
    } catch {
      /* penyimpanan browser tidak tersedia */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (inTools) setOpen(true);
  }, [inTools]);

  function toggle() {
    setOpen((v) => {
      try {
        localStorage.setItem(TOOLS_OPEN_KEY, v ? "0" : "1");
      } catch {
        /* abaikan */
      }
      return !v;
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent", inTools && !open && "bg-accent font-medium")}
      >
        <Wrench className="size-4" /> {t.toolsPro}
        <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{t.newBadge}</span>
        <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="mb-1 ml-4 max-h-[42vh] overflow-y-auto border-l pl-1.5">
          <Link
            href="/tools"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
              pathname === "/tools" && "bg-accent font-medium text-foreground",
            )}
          >
            <LayoutGrid className="size-3.5" /> Semua tools & kuota
          </Link>
          {MENU_GROUPS.map((g) => (
            <div key={g.addon} className="mt-1.5">
              <p className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">{g.label}</p>
              {TOOLS.filter((tool) => tool.addon === g.addon).map((tool) => {
                const href = `/tools/${tool.id}`;
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={tool.id}
                    href={href}
                    onClick={onNavigate}
                    title={tool.name}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                      active && "bg-accent font-medium text-foreground",
                    )}
                  >
                    <ToolIcon id={tool.id} className="size-3.5 shrink-0" />
                    <span className="truncate">{tool.menu}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
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
  onDragStart,
  dropTarget,
  dragging,
}: {
  project: WorkspaceSummary;
  chats: ChatSummary[];
  open: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate?: () => void;
  onRename: (c: ChatSummary) => void;
  onRemove: (c: ChatSummary) => void;
  onDragStart: (e: React.PointerEvent) => void;
  dropTarget: boolean;
  dragging: boolean;
}) {
  const { t } = useApp();
  const Icon = open ? FolderOpen : Folder;
  return (
    <div>
      <div
        data-project-id={project.id}
        onPointerDown={onDragStart}
        className={cn(
          "group flex cursor-grab items-center rounded-lg hover:bg-accent active:cursor-grabbing",
          dropTarget && "bg-primary/15 ring-2 ring-primary",
          dragging && "opacity-40",
        )}
        title="Geser untuk mengubah urutan · lepas chat di sini untuk memasukkannya ke project"
      >
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
  projects,
  onMove,
  onDragStart,
  dragging,
}: {
  chat: HistoryItem;
  active: boolean;
  onNavigate?: () => void;
  onRename: (c: HistoryItem) => void;
  onRemove: (c: HistoryItem) => void;
  /** Bila diisi, chat bisa digeser/dipindah ke salah satu project ini. */
  projects?: WorkspaceSummary[];
  onMove?: (projectId: string) => void;
  onDragStart?: (e: React.PointerEvent) => void;
  dragging?: boolean;
}) {
  const { t } = useApp();
  const movable = Boolean(projects && onMove && !chat.toolRun && !chat.workspace_id);
  return (
    <div
      onPointerDown={movable ? onDragStart : undefined}
      className={cn("group flex items-center rounded-lg hover:bg-accent", active && "bg-accent", movable && "cursor-grab", dragging && "opacity-40")}
      title={movable ? "Geser ke folder project untuk memindahkan" : undefined}
    >
      <Link href={itemHref(chat)} onClick={onNavigate} draggable={false} className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-sm">
        {chat.toolRun && (
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/15 text-primary" title={toolInfo(chat.toolRun.tool)?.name}>
            <ToolIcon id={chat.toolRun.tool} className="size-3" />
          </span>
        )}
        <span className="truncate">{chat.title}</span>
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
          {movable && !!projects?.length && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Pindahkan ke project</DropdownMenuLabel>
              {projects.slice(0, 8).map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => onMove?.(p.id)}>
                  <FolderInput /> <span className="truncate">{p.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem className="text-destructive" onClick={() => onRemove(chat)}>
            <Trash2 /> {chat.toolRun ? "Sembunyikan" : t.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
