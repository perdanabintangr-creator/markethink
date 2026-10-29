"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BrainCircuit,
  CalendarDays,
  CreditCard,
  Files,
  FolderOpen,
  LayoutDashboard,
  LayoutGrid,
  MessageSquarePlus,
  MessageSquareText,
  Search,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { localizedTools, toolNameL } from "@/lib/addons/i18n";
import { workspaceUiText } from "@/lib/i18n/workspace-ui";
import type { ChatSummary, ToolRunSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp } from "./app-context";

export const OPEN_COMMAND_PALETTE = "mt:open-cmdk";
export const openCommandPalette = () => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE));

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon | { tool: string };
  /** Teks tambahan untuk pencarian (tidak ditampilkan). */
  keywords?: string;
}

/** Palet perintah (Ctrl/⌘ + K): lompat ke halaman, tool, project, chat — atau langsung tanya AI. */
export function CommandPalette() {
  const { lang, workspaces } = useApp();
  const t = workspaceUiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [recent, setRecent] = useState<Item[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
    };
  }, []);

  // Riwayat dimuat saat palet dibuka (selalu yang terbaru).
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSel(0);
    let alive = true;
    void fetch("/api/chats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { chats?: ChatSummary[]; toolRuns?: ToolRunSummary[] } | null) => {
        if (!alive || !data) return;
        const chats = (data.chats ?? []).map(
          (c): Item & { at: string } => ({ id: `c:${c.id}`, group: t.cmdRecent, label: c.title, href: `/chat/${c.id}`, icon: MessageSquareText, at: c.updated_at }),
        );
        const runs = (data.toolRuns ?? []).map(
          (r): Item & { at: string } => ({
            id: `r:${r.id}`,
            group: t.cmdRecent,
            label: r.title || toolNameL(r.tool, lang),
            hint: toolNameL(r.tool, lang),
            href: `/tools/${r.tool}/${r.id}`,
            icon: { tool: r.tool },
            at: r.created_at,
          }),
        );
        setRecent([...chats, ...runs].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 40));
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [open, lang, t.cmdRecent]);

  const base = useMemo<Item[]>(
    () => [
      { id: "new-chat", group: t.cmdCreate, label: t.newChat, href: "/chat", icon: MessageSquarePlus, keywords: "chat baru new tanya ai" },
      { id: "agent", group: t.cmdCreate, label: t.agent, href: "/tools/agent", icon: BrainCircuit, keywords: "agent otomatis" },
      { id: "new-project", group: t.cmdCreate, label: t.newProject, href: "/workspaces", icon: FolderOpen, keywords: "project brand kit klien" },
      { id: "dashboard", group: t.cmdGo, label: t.dashboard, href: "/dashboard", icon: LayoutDashboard, keywords: "beranda home" },
      { id: "tools", group: t.cmdGo, label: t.smartTools, href: "/tools", icon: LayoutGrid, keywords: "tools pro" },
      { id: "results", group: t.cmdGo, label: t.results, href: "/hasil", icon: Files, keywords: "hasil output riwayat" },
      { id: "calendar", group: t.cmdGo, label: t.calendar, href: "/kalender", icon: CalendarDays, keywords: "jadwal posting kalender" },
      { id: "projects", group: t.cmdGo, label: t.projects, href: "/workspaces", icon: FolderOpen },
      { id: "settings", group: t.cmdGo, label: t.settings, href: "/settings", icon: Settings, keywords: "font tema bahasa akun" },
      { id: "pricing", group: t.cmdGo, label: t.pricing, href: "/pricing", icon: CreditCard, keywords: "paket upgrade bayar kredit" },
      ...localizedTools(lang).map((tool) => ({
        id: `tool:${tool.id}`,
        group: t.cmdTools,
        label: tool.name,
        hint: tool.short,
        href: `/tools/${tool.id}`,
        icon: { tool: tool.id },
        keywords: tool.menu,
      })),
      ...workspaces.map((w) => ({ id: `ws:${w.id}`, group: t.cmdProjects, label: w.name, href: `/chat?workspace=${w.id}`, icon: FolderOpen })),
    ],
    [lang, t, workspaces],
  );

  const q = query.trim().toLowerCase();
  const items = useMemo(() => {
    if (!q) return [...base.filter((i) => i.group === t.cmdCreate || i.group === t.cmdGo), ...recent.slice(0, 6)];
    const words = q.split(/\s+/);
    const hit = (i: Item) => {
      const hay = `${i.label} ${i.hint ?? ""} ${i.keywords ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    };
    const ask: Item = { id: "ask", group: t.cmdCreate, label: t.cmdAsk(query.trim()), href: `/chat?prompt=${encodeURIComponent(query.trim())}`, icon: Sparkles };
    return [ask, ...base.filter(hit), ...recent.filter(hit).slice(0, 12)];
  }, [q, query, base, recent, t]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  function go(item: Item | undefined) {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  }

  // Kelompokkan sambil mempertahankan urutan.
  const groups: { name: string; items: { item: Item; idx: number }[] }[] = [];
  items.forEach((item, idx) => {
    const g = groups.find((x) => x.name === item.group) ?? groups[groups.push({ name: item.group, items: [] }) - 1];
    g.items.push({ item, idx });
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-background shadow-2xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(items.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              go(items[sel]);
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">{t.searchOrRun}</DialogPrimitive.Title>
          <div className="flex items-center gap-2.5 border-b px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.cmdPlaceholder}
              className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border border-b-2 px-1.5 text-[10px] text-muted-foreground">Esc</kbd>
          </div>
          <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
            {groups.map((g) => (
              <div key={g.name} className="pb-1">
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">{g.name}</p>
                {g.items.map(({ item, idx }) => {
                  const Icon = "tool" in item.icon ? null : item.icon;
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      type="button"
                      onMouseMove={() => setSel(idx)}
                      onClick={() => go(item)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm",
                        sel === idx ? "bg-accent text-accent-foreground" : "text-foreground",
                      )}
                    >
                      {Icon ? <Icon className="size-4 shrink-0 opacity-80" /> : <ToolIcon id={(item.icon as { tool: string }).tool} className="size-4 shrink-0 opacity-80" />}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint && <span className="hidden max-w-[45%] truncate text-xs text-muted-foreground sm:block">{item.hint}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
            {q && items.length <= 1 && <p className="px-2.5 py-2 text-xs text-muted-foreground">{t.cmdEmpty}</p>}
          </div>
          <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">{t.cmdHint}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
