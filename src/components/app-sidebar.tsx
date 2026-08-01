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
  Gavel,
  Crosshair,
  Wand2,
  Brain,
  Palette,
  Star,
  LineChart,
  FlaskConical,
  type LucideIcon,
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin, useRoles } from "@/lib/use-role";
import { Logo } from "./logo";

type Item = { title: string; url: string; icon: LucideIcon; beta?: boolean };
type Group = { label: string; items: Item[]; beta?: boolean };

/**
 * Five front doors instead of twenty.
 * Anything at prototype depth lives under "Labs" and is badged beta so the
 * polished tools aren't diluted by the experiments.
 */
const GROUPS: Group[] = [
  {
    label: "Learn",
    items: [
      { title: "Study Path", url: "/path", icon: Map },
      { title: "AI Tutor", url: "/tutor", icon: MessageSquare },
      { title: "Homework Helper", url: "/homework-helper", icon: Wand2 },
      { title: "Math Solver", url: "/math-solver", icon: Brain },
      { title: "Live Classes", url: "/classes", icon: GraduationCap },
    ],
  },
  {
    label: "Practice",
    items: [
      { title: "Quizzes", url: "/quiz", icon: ScrollText },
      { title: "Progress & Mastery", url: "/progress", icon: LineChart },
      { title: "Past Papers", url: "/papers", icon: BookOpenCheck },
      { title: "Revision", url: "/revision", icon: BookMarked },
    ],
  },
  {
    label: "Create",
    items: [
      { title: "Notes", url: "/notes", icon: StickyNote },
      { title: "Study Buddy", url: "/study-buddy", icon: Palette },
      { title: "Schemes", url: "/schemes", icon: BookMarked },
      { title: "Teach it back", url: "/teach", icon: GraduationCap, beta: true },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "Community", url: "/community", icon: MessageSquare },
      { title: "Study Rooms", url: "/rooms", icon: Users },
      { title: "Leaderboard", url: "/leaderboard", icon: Crown },
      { title: "Achievements", url: "/achievements", icon: Trophy },
      { title: "Events", url: "/events", icon: CalendarDays },
      { title: "Rate & Suggest", url: "/rate", icon: Star },
    ],
  },
  {
    label: "Labs",
    beta: true,
    items: [
      { title: "Virtual Lab", url: "/lab", icon: Beaker, beta: true },
      { title: "Funny Explainers", url: "/explainers", icon: Film, beta: true },
      { title: "Reel Library", url: "/explainers/library", icon: Library, beta: true },
      { title: "Exam Predictions", url: "/predictions", icon: Crosshair, beta: true },
      { title: "Examiner Twin", url: "/examiner", icon: Gavel, beta: true },
      { title: "Content Converter", url: "/converter", icon: FlaskConical, beta: true },
      { title: "AI Mentors", url: "/mentors", icon: Sparkles, beta: true },
    ],
  },
];

function BetaTag() {
  return (
    <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      beta
    </span>
  );
}

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isTeacher } = useRoles();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isKnownAdmin = !!user?.email && ["msn4sg@gmail.com", "tsr4sg@gmail.com"].includes(user.email.toLowerCase());
  const showAdmin = isAdmin || isKnownAdmin;

  const isActive = (url: string) => path === url || path.startsWith(url + "/");

  const renderItems = (items: Item[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
            <Link to={item.url} className="flex items-center gap-2">
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.title}</span>
              {item.beta && !collapsed ? <BetaTag /> : null}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard")} tooltip="Today">
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Today</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(showAdmin || isTeacher) && (
          <SidebarGroup>
            <SidebarGroupLabel>Staff</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {showAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin")} tooltip="Admin panel">
                      <Link to="/admin" className="flex items-center gap-2"><Shield className="h-4 w-4 shrink-0" /><span>Admin panel</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/teacher")} tooltip="Teacher panel">
                    <Link to="/teacher" className="flex items-center gap-2"><GraduationCap className="h-4 w-4 shrink-0" /><span>Teacher panel</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/staff-chat")} tooltip="Staff chat">
                    <Link to="/staff-chat" className="flex items-center gap-2"><MessageSquare className="h-4 w-4 shrink-0" /><span>Staff chat</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {GROUPS.map((group) => {
          const hasActive = group.items.some((i) => isActive(i.url));
          return (
            <Collapsible key={group.label} defaultOpen={hasActive || !group.beta} className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center gap-2">
                    <span>{group.label}</span>
                    {group.beta ? <BetaTag /> : null}
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>{renderItems(group.items)}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}

        <SidebarGroup>
          <SidebarGroupLabel>Preferences</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings">
                  <Link to="/settings" className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">Board & subjects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Study setup">
                  <Link to="/onboarding" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span className="truncate">Study setup</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        {!collapsed && <div className="mb-2 truncate text-xs text-muted-foreground">{user?.email}</div>}
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" /> {!collapsed && "Sign out"}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
