"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/users", label: "User" },
  { href: "/admin/costs", label: "Biaya AI" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/errors", label: "Error log" },
  { href: "/admin/quota", label: "Paket & pengaturan" },
  { href: "/admin/agents", label: "Agents" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground",
            (l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href)) && "border-primary font-medium text-foreground",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
