"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function BackofficeNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/backoffice", label: "Ringkasan" },
    { href: "/backoffice/customers", label: "Pelanggan" },
    { href: "/backoffice/sales", label: "Penjualan" },
    { href: "/backoffice/leads", label: "Calon pelanggan" },
    { href: "/backoffice/costs", label: "Biaya AI & margin" },
    ...(isAdmin ? [{ href: "/backoffice/team", label: "Tim" }] : []),
  ];
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {links.map((l) => {
        const active = l.href === "/backoffice" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground",
              active && "border-primary font-medium text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
