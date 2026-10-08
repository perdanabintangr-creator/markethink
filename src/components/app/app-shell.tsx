"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Logo } from "@/components/logo";
import { AppContextProvider, type AppContextValue } from "./app-context";
import { Sidebar } from "./sidebar";

export function AppShell({ value, children }: { value: AppContextValue; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AppContextProvider value={value}>
      <div className="flex h-dvh overflow-hidden">
        <aside className="hidden w-72 shrink-0 border-r md:block">
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
          <div className="flex h-12 items-center gap-2 border-b px-3 md:hidden">
            <button onClick={() => setOpen(true)} className="rounded-md p-1.5 hover:bg-accent" aria-label="Buka menu">
              <Menu className="size-5" />
            </button>
            <Logo href="/chat" className="text-sm" />
          </div>
          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </div>
    </AppContextProvider>
  );
}
