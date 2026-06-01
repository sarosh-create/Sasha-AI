import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  BookOpenCheck,
  LogOut,
  Sparkles,
  StickyNote,
  Map,
  Trophy,
  Users,
  Film,
  Beaker,
  Crown,
  Library,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "./logo";

const study = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Study Path", url: "/path", icon: Map },
  { title: "AI Tutor", url: "/tutor", icon: MessageSquare },
  { title: "Funny Explainers", url: "/explainers", icon: Film },
  { title: "Reel Library", url: "/explainers/library", icon: Library },
  { title: "Virtual Lab", url: "/lab", icon: Beaker },
  { title: "Quizzes", url: "/quiz", icon: ScrollText },
  { title: "Notes", url: "/notes", icon: StickyNote },
  { title: "Revision", url: "/revision", icon: BookOpenCheck },
];
const social = [
  { title: "Study Rooms", url: "/rooms", icon: Users },
  { title: "Leaderboard", url: "/leaderboard", icon: Crown },
  { title: "Achievements", url: "/achievements", icon: Trophy },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user } = useAuth();

  const renderItems = (items: typeof study) => (
    <SidebarMenu>
      {items.map((item) => {
        const active = path === item.url || path.startsWith(item.url + "/");
        return (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild isActive={active}>
              <Link to={item.url} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Study</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(study)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Social</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(social)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Preferences</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/onboarding" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Study setup</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        <div className="mb-2 truncate text-xs text-muted-foreground">
          {user?.email}
        </div>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
