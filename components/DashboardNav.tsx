"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/journal", label: "Journal", icon: "🎤" },
  { href: "/dashboard/entries", label: "Entries", icon: "📝" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "📈" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center space-x-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <span className="mr-1.5">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

