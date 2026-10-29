"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AppContextProvider, type AppContextValue } from "./app-context";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { UpdateNotifier } from "./update-notifier";

export function AppShell({ value, children }: { value: AppContextValue; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AppContextProvider value={value}>
      <UpdateNotifier />
      <CommandPalette />
      <div className="flex h-dvh overflow-hidden print:block print:h-auto print:overflow-visible">
        <aside className="hidden w-64 shrink-0 border-r md:block print:hidden">
          <Sidebar />
        </aside>
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 md:hidden" />
            <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs border-r bg-background md:hidden">
              <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
              <Sidebar onNavigate={() => setOpen(false)} />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setOpen(true)} />
          <main className="min-h-0 flex-1 print:h-auto">{children}</main>
        </div>
      </div>
    </AppContextProvider>
  );
}
