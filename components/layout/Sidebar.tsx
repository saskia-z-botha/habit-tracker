"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: CalendarDays, label: "today" },
  { href: "/history", icon: History, label: "history" },
  { href: "/settings", icon: Settings, label: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition",
              active
                ? "bg-pink-100 text-pink-700"
                : "text-pink-400 hover:bg-pink-50 hover:text-pink-600"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
