import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { HeaderStats } from "@/components/header-stats";
import { ensureDailyChallenges, refillHeartsIfDue, touchStreak } from "@/lib/gamification";
import { A11yProvider } from "@/lib/a11y";
import { A11yToggle } from "@/components/a11y-toggle";
import { EmojiBurstLayer } from "@/components/emoji-burst";
import { MobileNav } from "@/components/mobile-nav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    ensureDailyChallenges(user.id);
    refillHeartsIfDue(user.id);
    touchStreak(user.id);
    // Reward questions asked in the homepage chat before signing up.
    const vid = localStorage.getItem("sasha:visitorId");
    if (vid && localStorage.getItem("sasha:visitorClaimed") !== user.id) {
      supabase.auth.getSession().then(async ({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/public/visitor-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ visitorId: vid }),
        });
        if (!res.ok) return;
        localStorage.setItem("sasha:visitorClaimed", user.id);
        const j = await res.json();
        if (j.xp > 0) toast.success(`+${j.xp} XP for your questions before signing up${j.badge ? " — Curious Falcon badge unlocked!" : ""}`);
      }).catch(() => {});
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <A11yProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <HeaderStats />
                <A11yToggle />
              </div>
            </header>
            <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+64px)] md:pb-0">
              <Outlet />
            </main>
          </div>
        </div>
        <MobileNav />
        <EmojiBurstLayer />
      </SidebarProvider>
    </A11yProvider>
  );
}
