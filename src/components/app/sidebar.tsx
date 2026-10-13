"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  closestCenter,
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
  Pin,
  PinOff,
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
  pin_order: r.pin_order ?? null,
  sort_key: r.sort_key ?? null,
});
/** Angka urut riwayat: urutan manual bila ada, selain itu waktu aktivitas terakhir. */
const orderKey = (c: HistoryItem) => c.sort_key ?? Date.parse(c.updated_at);
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
import { useApp } from "./app-context";
import { CreditMeter } from "./credit-meter";

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

  // Riwayat umum (chat tanpa project + hasil tools), urut sesuai posisi yang diatur user (default: terbaru di atas).
  const history = useMemo(() => {
    const runMatches = q ? runs.filter((r) => r.title.toLowerCase().includes(q)) : runs;
    const list: HistoryItem[] = [...matching.filter((c) => !c.workspace_id), ...runMatches];
    return list.filter((c) => !isPinned(c)).sort((a, b) => orderKey(b) - orderKey(a));
  }, [matching, runs, q]);

  // Bagian "Disematkan": chat umum + hasil Tools Pro, urut sesuai posisi yang diatur user.
  const pinned = useMemo(() => {
    const runMatches = q ? runs.filter((r) => r.title.toLowerCase().includes(q)) : runs;
    const list: HistoryItem[] = [...matching.filter((c) => !c.workspace_id), ...runMatches];
    return list.filter(isPinned).sort((a, b) => a.pin_order! - b.pin_order!);
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
        if (id.startsWith("p:")) return !active.item.toolRun;
        if (id === HISTORY_ZONE) return isPinned(active.item);
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
    if (target === HISTORY_ZONE) {
      if (isPinned(item)) void savePins(pinned.filter((c) => c.id !== item.id), "Sematan dilepas");
      return;
    }
    if (target === PIN_ZONE) {
      if (!isPinned(item)) void savePins([...pinned, item], "Chat disematkan");
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
        if (isPinned(item)) void savePins(pinned.filter((c) => c.id !== item.id), "Sematan dilepas");
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
        void savePins(list, "Chat disematkan");
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
      toast.error("Gagal menyimpan urutan. Coba lagi.");
      emitChatsChanged();
    }
  }

  /** Simpan daftar sematan (urutan = posisi). Tampilan langsung berubah, lalu disimpan ke server. */
  async function savePins(list: HistoryItem[], message?: string) {
    const order = new Map(list.map((c, i) => [c.id, i]));
    const apply = <T extends HistoryItem>(c: T): T => ({ ...c, pin_order: order.get(c.id) ?? null });
    setChats((cs) => cs.map(apply));
    setRuns((rs) => rs.map(apply));
    const res = await fetch("/api/pins", {
      method: "PATCH",
      body: JSON.stringify({ items: list.map((c) => ({ id: c.id, kind: c.toolRun ? "run" : "chat" })) }),
    });
    if (!res.ok) {
      toast.error("Gagal menyimpan. Coba lagi.");
      emitChatsChanged();
    } else if (message) toast.success(message);
  }

  function togglePin(c: HistoryItem) {
    const rest = pinned.filter((x) => x.id !== c.id);
    void savePins(isPinned(c) ? rest : [c, ...rest], isPinned(c) ? "Sematan dilepas" : "Chat disematkan");
  }

  /** Pindahkan chat umum ke dalam project (drag & drop atau menu). */
  async function moveChat(chatId: string, projectId: string) {
    const chat = chats.find((c) => c.id === chatId);
    const project = workspaces.find((w) => w.id === projectId);
    if (!chat || !project || chat.workspace_id === projectId) return;
    if (chat.workspace_id) return void toast.error("Chat yang sudah berisi percakapan di project tidak bisa dipindah.");
    setChats((list) => list.map((c) => (c.id === chatId ? { ...c, workspace_id: projectId, pin_order: null } : c)));
    if (isPinned(chat)) void fetch("/api/pins", { method: "PATCH", body: JSON.stringify({ items: pinned.filter((c) => c.id !== chatId).map((c) => ({ id: c.id, kind: c.toolRun ? "run" : "chat" })) }) });
    setExpanded((s) => new Set(s).add(projectId));
    const res = await fetch(`/api/chats/${chatId}`, { method: "PATCH", body: JSON.stringify({ workspace_id: projectId }) });
    if (!res.ok) {
      toast.error("Gagal memindahkan chat. Coba lagi.");
    } else {
      toast.success(`Dipindah ke project "${project.name}"`);
    }
    emitChatsChanged();
  }

  /** Simpan urutan project baru. */
  async function saveProjectOrder(ids: string[]) {
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
          {loaded && !history.length && !pinned.length && <p className="px-2 py-4 text-sm text-muted-foreground">{t.noChats}</p>}
          {/* Label "Riwayat"; saat menggeser (dan belum ada sematan) berubah jadi area sematkan dengan tinggi sama — daftar tidak bergeser. */}
          {activeItem && !pinned.length ? (
            <EmptyPinTarget highlight={over?.id === PIN_ZONE} />
          ) : (
            history.length > 0 && <p className="flex h-7 items-center px-2 text-xs font-medium text-muted-foreground">Riwayat</p>
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

function PinZone({ highlight, children }: { highlight: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: PIN_ZONE });
  return (
    <div ref={setNodeRef} className={cn("mb-3 rounded-lg transition-colors", highlight && "bg-primary/10 ring-2 ring-primary")}>
      <p className="flex items-center gap-1 px-2 pb-1 text-xs font-medium text-muted-foreground">
        <Pin className="size-3" /> Disematkan
      </p>
      {children}
      {highlight && <p className="px-2 py-1.5 text-xs text-primary">Lepas untuk menyematkan</p>}
    </div>
  );
}

function EmptyPinTarget({ highlight }: { highlight: boolean }) {
  const { setNodeRef } = useDroppable({ id: PIN_ZONE });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-md border border-dashed border-primary/50 bg-primary/5 px-2 text-xs text-primary transition-colors",
        highlight && "border-solid bg-primary/10 ring-2 ring-primary",
      )}
    >
      <Pin className="size-3.5" /> Lepas di sini untuk menyematkan
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
  dropTarget,
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
}) {
  const { t } = useApp();
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
  onMove?: (projectId: string) => void;
  /** Bila diisi, baris bisa digeser (drag & drop). */
  dnd?: RowDnd;
  onTogglePin?: (c: HistoryItem) => void;
}) {
  const { t } = useApp();
  const movable = Boolean(projects && onMove && !chat.toolRun && !chat.workspace_id);
  return (
    <div
      ref={dnd?.setNodeRef}
      style={dnd?.style}
      {...(dnd ? { ...dnd.attributes, ...dnd.listeners, tabIndex: -1 } : {})}
      className={cn("group flex touch-manipulation items-center rounded-lg hover:bg-accent", active && "bg-accent", dnd?.isDragging && "opacity-40")}
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
          {onTogglePin && (
            <DropdownMenuItem onClick={() => onTogglePin(chat)}>
              {isPinned(chat) ? <PinOff /> : <Pin />} {isPinned(chat) ? "Lepas sematan" : "Sematkan"}
            </DropdownMenuItem>
          )}
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
