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
  GraduationCap,
  CalendarDays,
  BookMarked,
  Shield,
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
import { useIsAdmin, useRoles } from "@/lib/use-role";
import { Logo } from "./logo";

const study = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Study Path", url: "/path", icon: Map },
  { title: "AI Tutor", url: "/tutor", icon: MessageSquare },
  { title: "Live Classes", url: "/classes", icon: GraduationCap },
  { title: "Events", url: "/events", icon: CalendarDays },
  { title: "Schemes", url: "/schemes", icon: BookMarked },
  { title: "Funny Explainers", url: "/explainers", icon: Film },
  { title: "Reel Library", url: "/explainers/library", icon: Library },
  { title: "Virtual Lab", url: "/lab", icon: Beaker },
  { title: "Quizzes", url: "/quiz", icon: ScrollText },
  { title: "Past Papers", url: "/papers", icon: BookOpenCheck },
  { title: "Notes", url: "/notes", icon: StickyNote },
  { title: "Revision", url: "/revision", icon: BookOpenCheck },
];
const social = [
  { title: "Community", url: "/community", icon: MessageSquare },
  { title: "Study Rooms", url: "/rooms", icon: Users },
  { title: "Leaderboard", url: "/leaderboard", icon: Crown },
  { title: "Achievements", url: "/achievements", icon: Trophy },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isTeacher } = useRoles();
  const isKnownAdmin = !!user?.email && ["msn4sg@gmail.com", "tsr4sg@gmail.com"].includes(user.email.toLowerCase());
  const showAdmin = isAdmin || isKnownAdmin;

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
        {(showAdmin || isTeacher) && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {showAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={path.startsWith("/admin")}>
                      <Link to="/admin" className="flex items-center gap-2"><Shield className="h-4 w-4" /><span>Admin panel</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path.startsWith("/teacher")}>
                    <Link to="/teacher" className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /><span>Teacher panel</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path.startsWith("/staff-chat")}>
                    <Link to="/staff-chat" className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /><span>Staff chat</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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
