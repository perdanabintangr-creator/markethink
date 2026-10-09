"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  Clock,
  FileWarning,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Receipt,
  Search,
  Tag,
  User,
  Users,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { logoutAction } from "../actions";

export interface ShellCounts {
  expiring: number;
  overdue: number;
  noRecord: number;
  leads: number;
}

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  ownerOnly?: boolean;
}
interface Group {
  title?: string;
  items: Item[];
}

function menu(c: ShellCounts): Group[] {
  return [
    { items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
    {
      title: "Pelanggan",
      items: [
        { href: "/customers", label: "Semua pelanggan", icon: Users },
        { href: "/customers?status=paying", label: "Berbayar", icon: BadgeCheck },
        { href: "/customers?status=free", label: "Free", icon: User },
        { href: "/customers?status=expiring", label: "Akan habis (7 hari)", icon: Clock, badge: c.expiring },
        { href: "/customers?status=overdue", label: "Lewat masa aktif", icon: AlertTriangle, badge: c.overdue },
        { href: "/customers?status=no_record", label: "Belum ada catatan bayar", icon: FileWarning, badge: c.noRecord },
        { href: "/leads", label: "Calon pelanggan", icon: Inbox, badge: c.leads },
      ],
    },
    {
      title: "Penjualan",
      items: [
        { href: "/sales/new", label: "Catat penjualan", icon: PlusCircle },
        { href: "/sales", label: "Transaksi", icon: Receipt },
        { href: "/sales/report", label: "Laporan bulanan", icon: BarChart3 },
        { href: "/sales/prices", label: "Harga paket", icon: Tag },
      ],
    },
    {
      title: "Keuangan",
      items: [{ href: "/costs", label: "Biaya AI & margin", icon: Wallet }],
    },
    {
      title: "Pengaturan",
      items: [
        { href: "/team", label: "Tim & akun", icon: UsersRound, ownerOnly: true },
        { href: "/account", label: "Akun saya", icon: KeyRound },
      ],
    },
  ];
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

function readStore(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* abaikan */
  }
}

function useIsActive() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (href: string) => {
    const [path, query] = href.split("?");
    if (query) {
      const want = new URLSearchParams(query);
      return pathname === path && [...want].every(([k, v]) => params.get(k) === v);
    }
    if (path === "/") return pathname === path;
    if (path === "/customers") return pathname.startsWith(path) && !params.get("status");
    if (path === "/sales") return pathname === path;
    return pathname.startsWith(path);
  };
}

function NavList({ groups, collapsed, onNavigate }: { groups: Group[]; collapsed: boolean; onNavigate?: () => void }) {
  const isActive = useIsActive();
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = readStore("bo_nav_closed");
    if (saved) setClosed(JSON.parse(saved));
  }, []);

  const toggle = (title: string) => {
    const next = { ...closed, [title]: !closed[title] };
    setClosed(next);
    writeStore("bo_nav_closed", JSON.stringify(next));
  };

  return (
    <nav className="space-y-5 px-3 py-4">
      {groups.map((g, gi) => {
        const isClosed = g.title ? closed[g.title] && !collapsed : false;
        return (
          <div key={g.title ?? gi}>
            {g.title && !collapsed && (
              <button
                type="button"
                onClick={() => toggle(g.title!)}
                className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground hover:text-foreground"
                aria-expanded={!isClosed}
              >
                {g.title}
                <ChevronDown className={cn("size-4 transition-transform", isClosed && "-rotate-90")} />
              </button>
            )}
            {g.title && collapsed && gi > 0 && <div className="mx-2 mb-2 border-t" />}
            {!isClosed && (
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = isActive(it.href);
                  const Icon = it.icon;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        onClick={onNavigate}
                        title={collapsed ? it.label : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-foreground",
                          active && "bg-accent font-medium text-foreground",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <Icon className={cn("size-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                        {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                        {!collapsed && !!it.badge && (
                          <span className="rounded-md border border-destructive/30 bg-destructive/10 px-1.5 text-xs font-medium text-destructive tabular-nums">
                            {it.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function BackofficeShell({
  user,
  counts,
  children,
}: {
  user: { name: string; username: string; role: "owner" | "staff" };
  counts: ShellCounts;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const groups = menu(counts)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.ownerOnly || user.role === "owner") }))
    .filter((g) => g.items.length);

  useEffect(() => setCollapsed(readStore("bo_sidebar") === "collapsed"), []);
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      writeStore("bo_sidebar", c ? "open" : "collapsed");
      return !c;
    });
  };

  const brand = (
    <Link href="/" className="flex items-center gap-2 font-semibold">
      <LogoMark className="size-8" />
      <span className="leading-tight">
        Markethink
        <span className="block text-[11px] font-medium text-primary">Back Office</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background px-4">
        <button type="button" className="rounded-md p-1.5 hover:bg-accent lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
          <Menu className="size-5" />
        </button>
        <div className={cn("hidden items-center justify-between gap-2 lg:flex", collapsed ? "w-auto" : "w-[232px]")}>
          {collapsed ? (
            <Link href="/" aria-label="Dashboard">
              <LogoMark className="size-8" />
            </Link>
          ) : (
            brand
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={collapsed ? "Lebarkan menu" : "Ciutkan menu"}
          >
            <ChevronLeft className={cn("size-5 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
        <div className="lg:hidden">{brand}</div>
        <form action="/customers" className="relative ml-auto hidden w-full max-w-xs sm:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            placeholder="Cari pelanggan (email / nama)"
            className="h-10 w-full rounded-lg border bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background sm:ml-0"
            aria-label="Menu akun"
          >
            {initials(user.name)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-foreground">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs font-normal text-muted-foreground">
                @{user.username} · {user.role === "owner" ? "Owner" : "Tim"}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">
                <KeyRound /> Ganti password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void logoutAction()}>
              <LogOut /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex">
        <aside
          className={cn(
            "sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 overflow-y-auto border-r bg-background lg:block",
            collapsed ? "w-[72px]" : "w-[264px]",
          )}
        >
          <Suspense fallback={null}>
            <NavList groups={groups} collapsed={collapsed} />
          </Suspense>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] overflow-y-auto bg-background shadow-xl">
              <div className="flex h-16 items-center justify-between border-b px-4">
                {brand}
                <button type="button" className="rounded-md p-1.5 hover:bg-accent" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
                  <X className="size-5" />
                </button>
              </div>
              <form action="/customers" className="relative px-3 pt-3 sm:hidden">
                <Search className="pointer-events-none absolute top-1/2 left-6 mt-1.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input name="q" placeholder="Cari pelanggan" className="h-10 w-full rounded-lg border bg-background pr-3 pl-9 text-sm" />
              </form>
              <Suspense fallback={null}>
                <NavList groups={groups} collapsed={false} onNavigate={() => setMobileOpen(false)} />
              </Suspense>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
