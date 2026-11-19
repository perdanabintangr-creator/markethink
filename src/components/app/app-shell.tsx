"use client";

import { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { History } from "lucide-react";
import { AppContextProvider, type AppContextValue } from "./app-context";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { UpdateNotifier } from "./update-notifier";
import { shellText } from "@/lib/i18n/shell";
import { cn } from "@/lib/utils";

const HISTORY_KEY = "mq:history-open";

/**
 * Kerangka aplikasi: sidebar kiri (menu, project, promosi), konten, dan panel Riwayat di kanan yang bisa
 * dibuka-tutup (bawaan tertutup; pilihan diingat). Di HP: menu = laci kiri, riwayat = laci kanan.
 */
export function AppShell({ value, children }: { value: AppContextValue; children: React.ReactNode }) {
  const s = shellText(value.lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyDrawer, setHistoryDrawer] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Panel riwayat baru dimuat saat pertama dibuka, lalu tetap terpasang (tidak memuat ulang tiap dibuka).
  const [historyMounted, setHistoryMounted] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(HISTORY_KEY) === "1") {
        setHistoryOpen(true);
        setHistoryMounted(true);
      }
    } catch {
      // Penyimpanan tidak tersedia → tetap tertutup.
    }
  }, []);

  const toggleHistory = useCallback((next?: boolean) => {
    setHistoryOpen((cur) => {
      const open = next ?? !cur;
      if (open) setHistoryMounted(true);
      try {
        localStorage.setItem(HISTORY_KEY, open ? "1" : "0");
      } catch {}
      return open;
    });
  }, []);

  return (
    <AppContextProvider value={value}>
      <UpdateNotifier />
      <CommandPalette />
      <div className="flex h-dvh overflow-hidden print:block print:h-auto print:overflow-visible">
        <aside className="hidden w-64 shrink-0 border-r md:block print:hidden">
          <Sidebar />
        </aside>

        {/* HP: menu (kiri) */}
        <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 md:hidden" />
            <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs border-r bg-background md:hidden">
              <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        {/* HP: riwayat (kanan) */}
        <DialogPrimitive.Root open={historyDrawer} onOpenChange={setHistoryDrawer}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 md:hidden" />
            <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 w-[85%] max-w-xs border-l bg-background md:hidden">
              <DialogPrimitive.Title className="sr-only">{s.history}</DialogPrimitive.Title>
              <Sidebar view="history" onNavigate={() => setHistoryDrawer(false)} onClose={() => setHistoryDrawer(false)} />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMenuOpen(true)} onHistory={() => setHistoryDrawer(true)} />
          <main className="min-h-0 flex-1 print:h-auto">{children}</main>
        </div>

        {/* Laptop: panel riwayat kanan */}
        <aside
          aria-hidden={!historyOpen}
          className={cn(
            "hidden shrink-0 overflow-hidden border-l transition-[width] duration-300 ease-out md:block print:hidden",
            historyOpen ? "w-72" : "w-0 border-l-0",
          )}
        >
          {historyMounted && (
            <div className="h-full w-72">
              <Sidebar view="history" onClose={() => toggleHistory(false)} />
            </div>
          )}
        </aside>

        {/* Laptop: strip tombol kanan */}
        <div className="hidden w-12 shrink-0 flex-col items-center gap-2 border-l bg-muted/40 py-3 md:flex print:hidden">
          <button
            type="button"
            onClick={() => toggleHistory()}
            aria-pressed={historyOpen}
            aria-label={historyOpen ? s.closeHistory : s.openHistory}
            title={historyOpen ? s.closeHistory : s.openHistory}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium transition-colors",
              historyOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <History className="size-5" />
            {s.history}
          </button>
        </div>
      </div>
    </AppContextProvider>
  );
}
