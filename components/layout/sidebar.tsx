"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/personas/new", label: "Personas" },
  { href: "/evaluations/new", label: "Evaluations" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname.startsWith(href.replace("/new", ""));
}

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = navItems;

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-border-subtle bg-white/80 px-6 py-8 lg:block">
        <div className="space-y-10">
          <div className="space-y-2">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-strong))] text-lg font-bold text-white">
                PP
              </div>
              <div>
                <p className="font-display text-xl font-bold tracking-tight text-foreground">
                  Persona Panel
                </p>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {isAdmin ? "Admin Access" : "Decision Support"}
                </p>
              </div>
            </Link>
          </div>

          <nav className="space-y-2">
            {items.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-surface-panel text-primary"
                      : "text-muted-foreground hover:bg-surface-panel hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="border-b border-border-subtle bg-white lg:hidden">
        <div className="px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-strong))] text-sm font-bold text-white">
              PP
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-foreground">
                Persona Panel
              </p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {isAdmin ? "Admin Access" : "Decision Support"}
              </p>
            </div>
          </Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-5 pb-4">
          {items.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-surface-panel text-primary"
                    : "bg-white text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
