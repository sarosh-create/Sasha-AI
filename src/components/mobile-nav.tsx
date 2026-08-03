import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Map, ScrollText, LineChart, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Phones get a thumb-reachable tab bar instead of a hidden sidebar.
 * Five destinations only — everything else lives behind the sidebar sheet.
 */
const TABS = [
  { to: "/dashboard", label: "Today", icon: LayoutDashboard },
  { to: "/path", label: "Path", icon: Map },
  { to: "/tutor", label: "Tutor", icon: MessageSquare },
  { to: "/quiz", label: "Quiz", icon: ScrollText },
  { to: "/progress", label: "Progress", icon: LineChart },
];

export function MobileNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = path === t.to || path.startsWith(t.to + "/");
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <t.icon className={cn("h-5 w-5 shrink-0", active && "scale-110 transition-transform")} />
                <span className="truncate">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
