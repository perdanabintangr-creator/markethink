"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy, type SortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  BrainCircuit,
  Wrench,
  ChevronRight,
  Crown,
  Folder,
  FolderInput,
  FolderOpen,
  FolderOutput,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  Languages,
  Loader2,
  LogOut,
  MessageSquarePlus,
  MessageSquareText,
  MessagesSquare,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  Zap,
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
import { isGenerating, type ChatSummary, type ToolRunSummary, type WorkspaceSummary } from "@/lib/types";
import { ToolIcon } from "@/components/tools/tool-icon";
import { MENU_GROUPS, TOOLS, toolInfo } from "@/lib/addons/catalog";
import { menuGroupLabel, proToolsLabel, toolMenuL, toolNameL } from "@/lib/addons/i18n";
import type { Lang } from "@/lib/i18n/dict";

/** Item riwayat: chat biasa atau hasil Tools Pro (punya `toolRun`). */
type HistoryItem = ChatSummary & { toolRun?: { tool: string } };

const runToItem = (r: ToolRunSummary, lang: Lang): HistoryItem => ({
  id: r.id,
  title: r.title || (toolInfo(r.tool) ? toolNameL(r.tool, lang) : proToolsLabel(lang)),
  updated_at: r.created_at,
  workspace_id: null,
  share_token: null,
  toolRun: { tool: r.tool },
  pin_order: r.pin_order ?? null,
  sort_key: r.sort_key ?? null,
});
/** Angka urut riwayat: urutan manual bila ada, selain itu waktu aktivitas terakhir. */
const orderKey = (c: HistoryItem) => c.sort_key ?? Date.parse(c.updated_at);
/** Item milik mode Tools Pro: hasil tools & chat "Bahas di Chat" dari hasil tools. */
const isToolsItem = (c: HistoryItem) => Boolean(c.toolRun || c.source_run_id || c.source_agent_id);
type SidebarMode = "chat" | "tools";
const MODE_KEY = "mt_sidebar_mode";
const isPinned = (c: HistoryItem) => c.pin_order !== null && c.pin_order !== undefined;

/** ID drag & drop: "i:<id>" = chat/hasil tools, "p:<id>" = folder project, "zone:*" = area lepas. */
const itemKey = (id: string) => `i:${id}`;
const projectKey = (id: string) => `p:${id}`;
const PIN_ZONE = "zone:pins";
const HISTORY_ZONE = "zone:history";

/** Penanganan drag untuk satu baris (dari useSortable / useDraggable). */
interface RowDnd {
  setNodeRef: (el: HTMLElement | null) => void;
  listeners: DraggableSyntheticListeners;
  attributes: DraggableAttributes;
  style?: React.CSSProperties;
  isDragging: boolean;
}

/** Strategi urutan yang hanya menggeser item bila yang di-drag berasal dari daftar yang sama. */
const onlyWhen = (enabled: boolean): SortingStrategy => (args) => (enabled ? verticalListSortingStrategy(args) : null);

/** Setelah drag selesai, cegah klik "nyasar" yang membuka chat / menutup folder. */
function swallowNextClick() {
  const block = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  window.addEventListener("click", block, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", block, { capture: true }), 80);
}
const itemHref = (c: HistoryItem) => (c.toolRun ? `/tools/${c.toolRun.tool}/${c.id}` : `/chat/${c.id}`);
import { cn } from "@/lib/utils";
import { shellText } from "@/lib/i18n/shell";
import { workspaceUiText } from "@/lib/i18n/workspace-ui";
import { UNLIMITED_CREDITS } from "@/lib/addons/format";
import { useApp } from "./app-context";
import { openCommandPalette } from "./command-palette";
import { useUsage } from "./usage-ring";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t, user, lang, workspaces, planName, planId } = useApp();
  const s = shellText(lang);
  const w = workspaceUiText(lang);
  // Sidebar dirender dua kali (desktop & laci HP) → id gradien logo harus unik.
  const logoId = `mt-logo-${useId().replace(/[^a-z0-9]/gi, "")}`;
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [runs, setRuns] = useState<HistoryItem[]>([]);
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
      setRuns(((data.toolRuns ?? []) as ToolRunSummary[]).map((r) => runToItem(r, lang)));
    }
    setLoaded(true);
  }, [lang]);

  useEffect(() => {
    void load();
    window.addEventListener(CHATS_CHANGED, load);
    return () => window.removeEventListener(CHATS_CHANGED, load);
  }, [load]);

  // Ada chat yang sedang dijawab AI → perbarui riwayat berkala sampai selesai (ikon loading hilang sendiri).
  const anyGenerating = chats.some((c) => isGenerating(c.generating_at));
  useEffect(() => {
    if (!anyGenerating) return;
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [anyGenerating, load]);

  // Pencarian riwayat kini lewat palet perintah (Ctrl+K); daftar di sidebar selalu lengkap.
  const q = "";
  const matching = useMemo(() => (q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats), [chats, q]);
  const activeChat = chats.find((c) => pathname === `/chat/${c.id}`);

  // Mode sidebar ala Claude Code: "Chat" (chat & project) atau "Tools Pro" (menu tools & riwayat hasil).
  const routeMode: SidebarMode | null = pathname.startsWith("/tools")
    ? "tools"
    : pathname.startsWith("/chat/") && activeChat
      ? activeChat.source_run_id || activeChat.source_agent_id
        ? "tools"
        : "chat"
      : pathname === "/chat"
        ? "chat"
        : null;
  const [mode, setModeState] = useState<SidebarMode>(routeMode ?? "chat");
  useEffect(() => {
    if (routeMode) return setModeState(routeMode);
    try {
      if (localStorage.getItem(MODE_KEY) === "tools") setModeState("tools");
    } catch {
      /* penyimpanan browser tidak tersedia */
    }
  }, [routeMode]);
  function switchMode(next: SidebarMode) {
    setModeState(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* abaikan */
    }
  }
  const inMode = useCallback((c: HistoryItem) => isToolsItem(c) === (mode === "tools"), [mode]);

  // Project yang sedang dibuka otomatis terbuka di sidebar.
  useEffect(() => {
    const id = activeChat?.workspace_id;
    if (id) setExpanded((s) => (s.has(id) ? s : new Set(s).add(id)));
  }, [activeChat?.workspace_id]);

  // Riwayat umum (chat tanpa project + hasil tools), urut sesuai posisi yang diatur user (default: terbaru di atas).
  const history = useMemo(() => {
    const runMatches = q ? runs.filter((r) => r.title.toLowerCase().includes(q)) : runs;
    const list: HistoryItem[] = [...matching.filter((c) => !c.workspace_id), ...runMatches];
    return list.filter((c) => !isPinned(c) && inMode(c)).sort((a, b) => orderKey(b) - orderKey(a));
  }, [matching, runs, q, inMode]);

  // Bagian "Disematkan": chat umum + hasil Tools Pro, urut sesuai posisi yang diatur user.
  // Semua sematan (kedua mode) — dipakai saat menyimpan agar sematan mode lain tidak ikut terlepas.
  const pinnedAll = useMemo(
    (): HistoryItem[] => [...chats.filter((c) => !c.workspace_id), ...runs].filter(isPinned).sort((a, b) => a.pin_order! - b.pin_order!),
    [chats, runs],
  );
  const pinned = useMemo(() => {
    const runMatches = q ? runs.filter((r) => r.title.toLowerCase().includes(q)) : runs;
    const list: HistoryItem[] = [...matching.filter((c) => !c.workspace_id), ...runMatches];
    return list.filter((c) => isPinned(c) && inMode(c)).sort((a, b) => a.pin_order! - b.pin_order!);
  }, [matching, runs, q, inMode]);

  function toggleProject(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Geser dengan mouse (pointer events, bukan drag bawaan browser yang sering tidak jalan pada link).
  const allItems = useMemo<HistoryItem[]>(() => [...chats, ...runs], [chats, runs]);

  // ---------------- Drag & drop (ala ChatGPT/Claude): baris ikut kursor, item lain bergeser memberi ruang.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // HP: tekan-tahan sebentar lalu geser (agar tidak bentrok dengan scroll).
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );
  const [active, setActive] = useState<{ kind: "item"; item: HistoryItem } | { kind: "project"; project: WorkspaceSummary } | null>(null);
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null);
  const activeItem = active?.kind === "item" ? active.item : null;

  const collision: CollisionDetection = useCallback(
    (args) => {
      const allowed = (id: string) => {
        if (!active) return false;
        if (active.kind === "project") return id.startsWith("p:");
        if (id.startsWith("p:")) return !active.item.toolRun && id !== projectKey(active.item.workspace_id ?? "");
        if (id === HISTORY_ZONE) return isPinned(active.item) || Boolean(active.item.workspace_id);
        return true;
      };
      const pick = (hits: ReturnType<CollisionDetection>) =>
        hits.filter((h) => allowed(String(h.id))).sort((a, b) => Number(String(a.id).startsWith("zone:")) - Number(String(b.id).startsWith("zone:")));
      // Folder project: cara standar daftar urut (titik tengah terdekat). Chat: elemen tepat di bawah kursor.
      if (active?.kind === "project") return pick(closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => allowed(String(c.id))) }));
      return pick(pointerWithin(args));
    },
    [active],
  );

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("p:")) {
      const project = projects.find((w) => projectKey(w.id) === id);
      if (project) setActive({ kind: "project", project });
    } else {
      const item = allItems.find((c) => itemKey(c.id) === id);
      if (item) setActive({ kind: "item", item });
    }
  }

  function onDragMove(e: DragMoveEvent) {
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return setOver(null);
    const start = e.activatorEvent as MouseEvent | TouchEvent;
    const y0 = "touches" in start ? (start.touches[0]?.clientY ?? 0) : start.clientY;
    const o = e.over!.rect;
    const after = y0 + e.delta.y > o.top + o.height / 2;
    setOver((cur) => (cur?.id === overId && cur.after === after ? cur : { id: overId, after }));
  }

  function onDragEnd(e: DragEndEvent) {
    const cur = active;
    const target = e.over ? String(e.over.id) : null;
    const after = over?.after ?? false;
    setActive(null);
    setOver(null);
    swallowNextClick();
    if (!cur || !target) return;

    if (cur.kind === "project") {
      if (target.startsWith("p:")) {
        const ids = projects.map((w) => w.id);
        const from = ids.indexOf(cur.project.id);
        const to = ids.indexOf(target.slice(2));
        if (from !== -1 && to !== -1 && from !== to) void saveProjectOrder(arrayMove(ids, from, to));
      }
      return;
    }

    const item = cur.item;
    if (target.startsWith("p:")) return void moveChat(item.id, target.slice(2));
    // Chat dari dalam folder project yang dilepas di luar folder → keluarkan dari project dulu.
    const fromProject = Boolean(item.workspace_id);
    if (fromProject) void moveChat(item.id, null, { quiet: target === PIN_ZONE || pinned.some((c) => itemKey(c.id) === target) });
    if (target === HISTORY_ZONE) {
      if (fromProject) void placeInHistory(item, undefined, history[0]);
      else if (isPinned(item)) void savePins(pinned.filter((c) => c.id !== item.id), s.pinRemoved);
      return;
    }
    if (target === PIN_ZONE) {
      if (!isPinned(item)) void savePins([...pinned, item], s.chatPinned);
      return;
    }
    if (target.startsWith("i:")) {
      const overHistory = history.find((c) => itemKey(c.id) === target);
      if (overHistory) {
        // Atur posisi di riwayat: dari riwayat sendiri (geser urutan) atau dari "Disematkan" (lepas sematan di posisi itu).
        const without = history.filter((c) => c.id !== item.id);
        const from = history.findIndex((c) => c.id === item.id);
        const overIdx = without.findIndex((c) => c.id === overHistory.id);
        const at = from !== -1 ? history.findIndex((c) => c.id === overHistory.id) : overIdx + (after ? 1 : 0);
        if (from === at) return;
        const list = [...without];
        list.splice(at, 0, item);
        void placeInHistory(item, list[at - 1], list[at + 1]);
        if (isPinned(item)) void savePins(pinned.filter((c) => c.id !== item.id), s.pinRemoved);
        return;
      }
      const overItem = pinned.find((c) => itemKey(c.id) === target);
      if (!overItem) return;
      if (isPinned(item)) {
        // Urutkan ulang di dalam "Disematkan".
        const from = pinned.findIndex((c) => c.id === item.id);
        const to = pinned.findIndex((c) => c.id === overItem.id);
        if (from !== to) void savePins(arrayMove(pinned, from, to));
      } else {
        const list = [...pinned];
        list.splice(list.findIndex((c) => c.id === overItem.id) + (after ? 1 : 0), 0, item);
        void savePins(list, s.chatPinned);
      }
    }
  }

  /** Taruh item riwayat di antara dua tetangganya (angka urut di tengah-tengah), lalu simpan. */
  async function placeInHistory(item: HistoryItem, above?: HistoryItem, below?: HistoryItem) {
    const key =
      above && below ? (orderKey(above) + orderKey(below)) / 2 : above ? orderKey(above) - 1_000 : below ? orderKey(below) + 1_000 : Date.now();
    const apply = <T extends HistoryItem>(c: T): T => (c.id === item.id ? { ...c, sort_key: key } : c);
    setChats((cs) => cs.map(apply));
    setRuns((rs) => rs.map(apply));
    const res = await fetch("/api/history-order", {
      method: "PATCH",
      body: JSON.stringify({ id: item.id, kind: item.toolRun ? "run" : "chat", sort_key: key }),
    });
    if (!res.ok) {
      toast.error(s.saveOrderFailed);
      emitChatsChanged();
    }
  }

  /** Simpan daftar sematan (urutan = posisi). Tampilan langsung berubah, lalu disimpan ke server. */
  async function savePins(current: HistoryItem[], message?: string) {
    const list = [...current, ...pinnedAll.filter((c) => !inMode(c) && !current.some((x) => x.id === c.id))];
    const order = new Map(list.map((c, i) => [c.id, i]));
    const apply = <T extends HistoryItem>(c: T): T => ({ ...c, pin_order: order.get(c.id) ?? null });
    setChats((cs) => cs.map(apply));
    setRuns((rs) => rs.map(apply));
    const res = await fetch("/api/pins", {
      method: "PATCH",
      body: JSON.stringify({ items: list.map((c) => ({ id: c.id, kind: c.toolRun ? "run" : "chat" })) }),
    });
    if (!res.ok) {
      toast.error(s.saveFailed);
      emitChatsChanged();
    } else if (message) toast.success(message);
  }

  function togglePin(c: HistoryItem) {
    const rest = pinned.filter((x) => x.id !== c.id);
    void savePins(isPinned(c) ? rest : [c, ...rest], isPinned(c) ? s.pinRemoved : s.chatPinned);
  }

  /** Pindahkan chat umum ke dalam project (drag & drop atau menu). */
  async function moveChat(chatId: string, projectId: string | null, opts: { quiet?: boolean } = {}) {
    const chat = chats.find((c) => c.id === chatId);
    const project = projectId ? workspaces.find((w) => w.id === projectId) : null;
    if (!chat || (projectId && !project) || chat.workspace_id === projectId) return;
    setChats((list) => list.map((c) => (c.id === chatId ? { ...c, workspace_id: projectId, pin_order: projectId ? null : c.pin_order } : c)));
    if (projectId && isPinned(chat))
      void fetch("/api/pins", { method: "PATCH", body: JSON.stringify({ items: pinnedAll.filter((c) => c.id !== chatId).map((c) => ({ id: c.id, kind: c.toolRun ? "run" : "chat" })) }) });
    if (projectId) setExpanded((s) => new Set(s).add(projectId));
    const res = await fetch(`/api/chats/${chatId}`, { method: "PATCH", body: JSON.stringify({ workspace_id: projectId }) });
    if (!res.ok) {
      toast.error(s.moveFailed);
      emitChatsChanged();
    } else if (!opts.quiet) {
      toast.success(project ? s.movedToProject(project.name) : s.movedOutOfProject);
    }
  }

  /** Simpan urutan project baru. */
  async function saveProjectOrder(ids: string[]) {
    setOrder(ids);
    const res = await fetch("/api/workspaces/order", { method: "PATCH", body: JSON.stringify({ ids }) });
    if (!res.ok) {
      toast.error(s.saveProjectOrderFailed);
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
          return setDlgError(data.error === "limit_reached" ? s.projectLimit(data.limit ?? "") : s.createProjectFailed);
        }
        setDlg(null);
        setExpanded((s) => new Set(s).add(data.id));
        toast.success(s.projectCreated(data.name));
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
        toast.success(chat.toolRun ? s.resultHidden : s.chatDeleted);
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
      <div className="flex items-center justify-between px-1">
        <Logo href="/dashboard" gradientId={logoId} />
      </div>
      <button
        type="button"
        onClick={openCommandPalette}
        className="flex h-9 items-center gap-2 rounded-lg border bg-background px-2.5 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent"
      >
        <Search className="size-4" />
        {w.searchOrRun}
        <kbd className="ml-auto rounded border border-b-2 px-1 text-[10px]">Ctrl K</kbd>
      </button>
      <nav className="space-y-3">
        <NavGroup label={w.main}>
          <NavLink href="/dashboard" icon={LayoutDashboard} active={pathname === "/dashboard"} onNavigate={onNavigate}>
            {w.dashboard}
          </NavLink>
          <NavLink href="/chat" icon={MessageSquarePlus} active={pathname === "/chat"} onNavigate={onNavigate}>
            {w.newChat}
          </NavLink>
          <NavLink href="/tools/agent" icon={BrainCircuit} active={pathname.startsWith("/tools/agent")} onNavigate={onNavigate} badge={t.newBadge}>
            {w.agent}
          </NavLink>
        </NavGroup>
        <NavGroup label={w.work}>
          <NavLink href="/tools" icon={LayoutGrid} active={pathname === "/tools"} onNavigate={onNavigate}>
            {w.smartTools}
          </NavLink>
          <NavLink href="/workspaces" icon={FolderOpen} active={pathname.startsWith("/workspaces")} onNavigate={onNavigate}>
            {w.projects}
          </NavLink>
        </NavGroup>
      </nav>
      <div className="space-y-1.5">
        <p className="px-2 text-xs font-medium text-muted-foreground">{w.history}</p>
        <ModeSwitch mode={mode} onChange={switchMode} />
      </div>

      <DndContext
        id="sidebar-dnd"
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        autoScroll={{ threshold: { x: 0, y: 0.1 }, acceleration: 6 }}
        onDragCancel={() => {
          setActive(null);
          setOver(null);
        }}
      >
      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        {mode === "tools" && <ToolsMenu pathname={pathname} onNavigate={onNavigate} />}
        {mode === "chat" && (
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
          <SortableContext items={projects.map((w) => projectKey(w.id))} strategy={onlyWhen(active?.kind === "project")}>
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
                dropTarget={Boolean(activeItem) && over?.id === projectKey(w.id)}
                projects={projects}
                onMoveChat={(chatId, projectId) => void moveChat(chatId, projectId)}
              />
            );
          })}
          </SortableContext>
          {!workspaces.length && (
            <button
              onClick={newProject}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            >
              <Plus className="size-4" /> {t.newProject}
            </button>
          )}
        </div>
        )}

        {pinned.length > 0 && (
          <PinZone highlight={over?.id === PIN_ZONE && Boolean(activeItem) && !isPinned(activeItem!)}>
            <SortableContext items={pinned.map((c) => itemKey(c.id))} strategy={onlyWhen(Boolean(activeItem && isPinned(activeItem)))}>
              {pinned.map((c) => (
                <SortableHistoryRow
                  key={c.id}
                  chat={c}
                  line={activeItem && !isPinned(activeItem) && over?.id === itemKey(c.id) ? (over.after ? "after" : "before") : null}
                  render={(dnd) => (
                    <ChatItem
                      chat={c}
                      dnd={dnd}
                      active={pathname === itemHref(c)}
                      onNavigate={onNavigate}
                      onRename={rename}
                      onRemove={remove}
                      onTogglePin={togglePin}
                      projects={c.toolRun ? undefined : projects}
                      onMove={(projectId) => moveChat(c.id, projectId)}
                    />
                  )}
                />
              ))}
            </SortableContext>
          </PinZone>
        )}

        <HistoryZone highlight={over?.id === HISTORY_ZONE}>
          {loaded && !history.length && !pinned.length && (
            <p className="px-2 py-4 text-sm text-muted-foreground">{mode === "tools" ? s.noToolResults : t.noChats}</p>
          )}
          {/* Label "Riwayat"; saat menggeser (dan belum ada sematan) berubah jadi area sematkan dengan tinggi sama — daftar tidak bergeser. */}
          {activeItem && !pinned.length ? (
            <EmptyPinTarget highlight={over?.id === PIN_ZONE} />
          ) : (
            history.length > 0 && (
              <p className="flex h-7 items-center px-2 text-xs font-medium text-muted-foreground">{mode === "tools" ? s.toolsHistory : s.history}</p>
            )
          )}
          <SortableContext items={history.map((c) => itemKey(c.id))} strategy={onlyWhen(Boolean(activeItem && !isPinned(activeItem)))}>
            {history.map((c) => (
              <SortableHistoryRow
                key={c.id}
                chat={c}
                line={activeItem && isPinned(activeItem) && over?.id === itemKey(c.id) ? (over.after ? "after" : "before") : null}
                render={(dnd) => (
                  <ChatItem
                    chat={c}
                    dnd={dnd}
                    active={pathname === itemHref(c)}
                    onNavigate={onNavigate}
                    onRename={rename}
                    onRemove={remove}
                    onTogglePin={togglePin}
                    projects={c.toolRun ? undefined : projects}
                    onMove={(projectId) => moveChat(c.id, projectId)}
                  />
                )}
              />
            ))}
          </SortableContext>
        </HistoryZone>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {active?.kind === "item" && (
          <div className="flex cursor-grabbing items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 text-sm shadow-xl ring-1 ring-primary/30">
            {active.item.toolRun && (
              <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/15 text-primary">
                <ToolIcon id={active.item.toolRun.tool} className="size-3" />
              </span>
            )}
            <span className="truncate">{active.item.title}</span>
          </div>
        )}
        {active?.kind === "project" && (
          <div className="flex cursor-grabbing items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 text-sm shadow-xl ring-1 ring-primary/30">
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <Folder className="size-4 text-primary" />
            <span className="truncate">{active.project.name}</span>
          </div>
        )}
      </DragOverlay>
      </DndContext>

      <CreditMeter onNavigate={onNavigate} />

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
              <span className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-px text-[11px] font-semibold",
                    user.role === "admin"
                      ? "bg-foreground/10 text-foreground"
                      : planId === "beta"
                        ? "bg-muted text-muted-foreground ring-1 ring-border"
                        : planId === "promax"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                          : "bg-primary/15 text-primary",
                  )}
                >
                  {planId === "promax" && <Crown className="size-3" />}
                  {user.role === "admin" ? "Admin" : planName}
                </span>
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" onClick={onNavigate}>
              <Settings /> {t.settings}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/pricing" onClick={onNavigate}>
              <Zap /> {s.pricing}
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
                <DialogTitle>{dlg.chat.toolRun ? s.hideTitle : s.deleteTitle}</DialogTitle>
                <DialogDescription>
                  {dlg.chat.toolRun ? s.hideDesc(dlg.chat.title) : s.deleteDesc(dlg.chat.title)}
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
                  <DialogDescription>{s.newProjectDesc}</DialogDescription>
                )}
              </DialogHeader>
              <Input
                autoFocus
                value={dlgValue}
                onChange={(e) => setDlgValue(e.target.value)}
                maxLength={dlg?.kind === "rename" ? 120 : 80}
                placeholder={dlg?.kind === "rename" ? s.chatTitlePlaceholder : s.projectNamePlaceholder}
              />
              {dlgError && <p className="text-sm text-destructive">{dlgError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDlg(null)}>{t.cancel}</Button>
                <Button type="submit" disabled={dlgBusy || !dlgValue.trim()}>
                  {dlgBusy && <Loader2 className="animate-spin" />}
                  {dlg?.kind === "rename" ? s.save : s.createProject}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PinZone({ highlight, children }: { highlight: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: PIN_ZONE });
  const s = shellText(useApp().lang);
  return (
    <div ref={setNodeRef} className={cn("mb-3 rounded-lg transition-colors", highlight && "bg-primary/10 ring-2 ring-primary")}>
      <p className="flex items-center gap-1 px-2 pb-1 text-xs font-medium text-muted-foreground">
        <Pin className="size-3" /> {s.pinned}
      </p>
      {children}
      {highlight && <p className="px-2 py-1.5 text-xs text-primary">{s.dropToPin}</p>}
    </div>
  );
}

function EmptyPinTarget({ highlight }: { highlight: boolean }) {
  const { setNodeRef } = useDroppable({ id: PIN_ZONE });
  const s = shellText(useApp().lang);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-md border border-dashed border-primary/50 bg-primary/5 px-2 text-xs text-primary transition-colors",
        highlight && "border-solid bg-primary/10 ring-2 ring-primary",
      )}
    >
      <Pin className="size-3.5" /> {s.dropHereToPin}
    </div>
  );
}

function HistoryZone({ highlight, children }: { highlight: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: HISTORY_ZONE });
  return (
    <div ref={setNodeRef} className={cn("relative min-h-16 rounded-lg transition-colors", highlight && "bg-muted ring-1 ring-border")}>
      {children}
    </div>
  );
}

/** Chat di dalam folder project: bisa digeser keluar (ke riwayat, sematan, atau folder lain). */
function DraggableRow({ chat, render }: { chat: HistoryItem; render: (dnd: RowDnd) => React.ReactNode }) {
  const d = useDraggable({ id: itemKey(chat.id) });
  return <>{render({ setNodeRef: d.setNodeRef, listeners: d.listeners, attributes: d.attributes, isDragging: d.isDragging })}</>;
}

/** Baris di "Disematkan": bisa diurutkan (item lain bergeser memberi ruang). */
function SortableHistoryRow({ chat, line, render }: { chat: HistoryItem; line: "before" | "after" | null; render: (dnd: RowDnd) => React.ReactNode }) {
  const s = useSortable({ id: itemKey(chat.id) });
  return (
    <div className="relative">
      {line === "before" && <span className="absolute inset-x-1 -top-px z-10 h-0.5 rounded bg-primary" />}
      {render({
        setNodeRef: s.setNodeRef,
        listeners: s.listeners,
        attributes: s.attributes,
        isDragging: s.isDragging,
        style: { transform: CSS.Translate.toString(s.transform), transition: s.transition },
      })}
      {line === "after" && <span className="absolute inset-x-1 -bottom-px z-10 h-0.5 rounded bg-primary" />}
    </div>
  );
}


/** Menu "Tools Pro" yang bisa dibuka-tutup: submenu per kelompok (Market Research, Jualan Online, Iklan). */
function ToolsMenu({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { planId, user, lang } = useApp();
  const s = shellText(lang);
  // Paket Free: Tools Pro terkunci (perlu beli add-on/upgrade) → tandai dengan gembok.
  const lockedPlan = planId === "beta" && user.role !== "admin";
  // Kelompok role yang terbuka: default kelompok tool yang sedang dibuka.
  const currentGroup = toolInfo(pathname.split("/")[2] ?? "")?.addon;
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(currentGroup ? [currentGroup] : []));
  useEffect(() => {
    if (currentGroup) setOpenGroups((s) => (s.has(currentGroup) ? s : new Set(s).add(currentGroup)));
  }, [currentGroup]);
  const toggleGroup = (id: string) =>
    setOpenGroups((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mb-3">
      <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{s.toolsByRole}</p>
      {MENU_GROUPS.map((g) => {
        const tools = TOOLS.filter((tool) => tool.addon === g.addon);
        const groupOpen = openGroups.has(g.addon);
        return (
          <div key={g.addon}>
            <button
              type="button"
              onClick={() => toggleGroup(g.addon)}
              aria-expanded={groupOpen}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", groupOpen && "rotate-90")} />
              <span className="truncate">{menuGroupLabel(g.addon, lang)}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">{tools.length}</span>
            </button>
            {groupOpen && (
              <div className="mb-1 ml-3.5 border-l pl-1.5">
                {tools.map((tool) => {
                  const href = `/tools/${tool.id}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={tool.id}
                      href={href}
                      onClick={onNavigate}
                      title={toolNameL(tool.id, lang)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                        active && "bg-accent font-medium text-foreground",
                      )}
                    >
                      <ToolIcon id={tool.id} className="size-3.5 shrink-0" />
                      <span className="truncate">{toolMenuL(tool.id, lang)}</span>
                      {lockedPlan && <Lock className="ml-auto size-3 shrink-0 opacity-60" aria-label={s.locked} />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Pilihan mode sidebar ala Claude Code: Chat Markethink atau Tools Pro. */
function ModeSwitch({ mode, onChange }: { mode: SidebarMode; onChange: (m: SidebarMode) => void }) {
  const { t } = useApp();
  const items: { id: SidebarMode; label: string; icon: React.ReactNode }[] = [
    { id: "chat", label: "Chat", icon: <MessagesSquare className="size-3.5" /> },
    { id: "tools", label: t.toolsPro, icon: <Wrench className="size-3.5" /> },
  ];
  return (
    <div role="tablist" aria-label="Mode" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-0.5">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={mode === it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            mode === it.id && "bg-background text-foreground shadow-sm",
          )}
        >
          {it.icon} {it.label}
        </button>
      ))}
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
  dropTarget,
  projects,
  onMoveChat,
}: {
  project: WorkspaceSummary;
  chats: ChatSummary[];
  open: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate?: () => void;
  onRename: (c: ChatSummary) => void;
  onRemove: (c: ChatSummary) => void;
  dropTarget: boolean;
  projects: WorkspaceSummary[];
  onMoveChat: (chatId: string, projectId: string | null) => void;
}) {
  const { t, lang } = useApp();
  const s = shellText(lang);
  const Icon = open ? FolderOpen : Folder;
  const sortable = useSortable({ id: projectKey(project.id) });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      className={cn("relative", sortable.isDragging && "z-10 opacity-40")}
    >
      <div
        {...sortable.attributes}
        {...sortable.listeners}
        tabIndex={-1}
        className={cn(
          "group flex items-center rounded-lg transition-colors hover:bg-accent",
          dropTarget && "bg-primary/15 ring-2 ring-primary",
        )}
      >
        <button onClick={onToggle} className="py-1.5 pl-2 pr-0.5" aria-label={open ? s.collapseProject : s.expandProject}>
          <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        </button>
        {/* Klik nama project → halaman depan project (seperti ChatGPT/Claude Projects). */}
        <Link
          href={`/chat?workspace=${project.id}`}
          onClick={() => {
            if (!open) onToggle();
            onNavigate?.();
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pl-1 pr-2 text-left text-sm"
        >
          <Icon className="size-4 shrink-0 text-primary" />
          <span className="truncate">{project.name}</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="mr-1 rounded p-1 opacity-100 hover:bg-background md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label={s.projectMenu}
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
      {open && !sortable.isDragging && (
        <div className="mb-1 ml-4 border-l pl-1.5">
          <Link
            href={`/chat?workspace=${project.id}`}
            onClick={onNavigate}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="size-3.5" /> {t.newChatInProject}
          </Link>
          {chats.map((c) => (
            <DraggableRow
              key={c.id}
              chat={c}
              render={(dnd) => (
                <ChatItem
                  chat={c}
                  dnd={dnd}
                  active={pathname === `/chat/${c.id}`}
                  onNavigate={onNavigate}
                  onRename={onRename}
                  onRemove={onRemove}
                  projects={projects}
                  onMove={(projectId) => onMoveChat(c.id, projectId)}
                />
              )}
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
  dnd,
  onTogglePin,
}: {
  chat: HistoryItem;
  active: boolean;
  onNavigate?: () => void;
  onRename: (c: HistoryItem) => void;
  onRemove: (c: HistoryItem) => void;
  /** Bila diisi, chat bisa digeser/dipindah ke salah satu project ini. */
  projects?: WorkspaceSummary[];
  onMove?: (projectId: string | null) => void;
  /** Bila diisi, baris bisa digeser (drag & drop). */
  dnd?: RowDnd;
  onTogglePin?: (c: HistoryItem) => void;
}) {
  const { t, lang } = useApp();
  const s = shellText(lang);
  const movable = Boolean(projects && onMove && !chat.toolRun);
  const targets = (projects ?? []).filter((p) => p.id !== chat.workspace_id);
  return (
    <div
      ref={dnd?.setNodeRef}
      style={dnd?.style}
      {...(dnd ? { ...dnd.attributes, ...dnd.listeners, tabIndex: -1 } : {})}
      className={cn("group flex touch-manipulation items-center rounded-lg hover:bg-accent", active && "bg-accent", dnd?.isDragging && "opacity-40")}
    >
      <Link href={itemHref(chat)} onClick={onNavigate} draggable={false} className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-sm">
        {chat.toolRun && (
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/15 text-primary" title={toolInfo(chat.toolRun.tool) ? toolNameL(chat.toolRun.tool, lang) : undefined}>
            <ToolIcon id={chat.toolRun.tool} className="size-3" />
          </span>
        )}
        {!chat.toolRun && (chat.source_run_id || chat.source_agent_id) && (
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground" title={s.toolDiscussion}>
            <MessageSquareText className="size-3" />
          </span>
        )}
        <span className="truncate">{chat.title}</span>
        {isGenerating(chat.generating_at) && (
          <Loader2 className="ml-auto size-3.5 shrink-0 animate-spin text-primary" aria-label={s.replying} />
        )}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="mr-1 rounded p-1 opacity-100 hover:bg-background md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label={s.chatMenu}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRename(chat)}>
            <Pencil /> {t.rename}
          </DropdownMenuItem>
          {onTogglePin && (
            <DropdownMenuItem onClick={() => onTogglePin(chat)}>
              {isPinned(chat) ? <PinOff /> : <Pin />} {isPinned(chat) ? s.unpin : s.pin}
            </DropdownMenuItem>
          )}
          {movable && chat.workspace_id && (
            <DropdownMenuItem onClick={() => onMove?.(null)}>
              <FolderOutput /> {s.removeFromProject}
            </DropdownMenuItem>
          )}
          {movable && targets.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{s.moveToProject}</DropdownMenuLabel>
              {targets.slice(0, 8).map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => onMove?.(p.id)}>
                  <FolderInput /> <span className="truncate">{p.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem className="text-destructive" onClick={() => onRemove(chat)}>
            <Trash2 /> {chat.toolRun ? s.hide : t.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="px-2 pb-0.5 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  active,
  onNavigate,
  badge,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent",
        active ? "bg-accent font-medium text-accent-foreground" : "text-foreground/85",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <span className="truncate">{children}</span>
      {badge && <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{badge}</span>}
    </Link>
  );
}

/** Meter kredit bulan ini di kaki sidebar (selalu terlihat, seperti aplikasi SaaS). */
function CreditMeter({ onNavigate }: { onNavigate?: () => void }) {
  const { lang, credits } = useApp();
  const w = workspaceUiText(lang);
  const { used, unlimited, remaining } = useUsage();
  const fmt = (n: number) => n.toLocaleString(lang === "en" ? "en-US" : "id-ID");
  const tone = used >= 100 ? "bg-destructive" : used >= 80 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="space-y-2 rounded-xl border bg-background p-3 shadow-xs">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{w.credits}</span>
        <span className="tabular-nums text-muted-foreground">
          {unlimited || credits.monthLimit >= UNLIMITED_CREDITS ? w.unlimited : `${fmt(Math.max(0, remaining))} / ${fmt(credits.monthLimit)}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${100 - used}%` }} />
        </div>
      )}
      {!unlimited && (
        <Link href="/pricing" onClick={onNavigate} className="block text-xs font-medium text-primary hover:underline">
          {w.upgrade}
        </Link>
      )}
    </div>
  );
}
