import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Crown, Flame, Beaker, Zap } from "lucide-react";
import { awardBadge } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [
    { title: "Leaderboard — Sasha AI" },
    { name: "description", content: "See where you rank on the Sasha AI leaderboard for XP, weekly XP, lab XP and study streaks." },
    { property: "og:title", content: "Leaderboard — Sasha AI" },
    { property: "og:description", content: "Compete with other students on XP, weekly XP, lab XP and study streaks." },
    { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/leaderboard" },
  ] }),
  component: LeaderboardPage,
});

type Row = {
  user_id: string;
  display_name: string | null;
  xp: number;
  lab_xp: number;
  xp_week: number;
  streak_count: number;
  leaderboard_opt_in: boolean;
};

type Metric = "xp" | "xp_week" | "lab_xp" | "streak_count";
const TABS: { id: Metric; label: string; icon: any }[] = [
  { id: "xp_week", label: "This week", icon: Zap },
  { id: "xp", label: "All-time XP", icon: Crown },
  { id: "lab_xp", label: "Lab XP", icon: Beaker },
  { id: "streak_count", label: "Streak", icon: Flame },
];

function LeaderboardPage() {
  const { user } = useAuth();
  const [metric, setMetric] = useState<Metric>("xp_week");
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<Row | null>(null);
  const [optIn, setOptIn] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, xp, lab_xp, xp_week, streak_count, leaderboard_opt_in")
        .eq("leaderboard_opt_in", true)
        .order(metric, { ascending: false })
        .limit(50) as any;
      setRows((data ?? []) as Row[]);
    })();
  }, [metric]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("user_id, display_name, xp, lab_xp, xp_week, streak_count, leaderboard_opt_in")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) { setMe(data as Row); setOptIn(!!data.leaderboard_opt_in); }
      });
  }, [user]);

  useEffect(() => {
    if (!user || rows.length === 0) return;
    const idx = rows.findIndex((r) => r.user_id === user.id);
    if (idx >= 0 && idx < 10) awardBadge(user.id, "leaderboard_top10");
  }, [rows, user]);

  const toggleOpt = async (v: boolean) => {
    setOptIn(v);
    if (user) {
      await supabase.from("profiles").update({ leaderboard_opt_in: v } as any).eq("user_id", user.id);
    }
  };

  const valueOf = (r: Row) => r[metric] ?? 0;
  const nameOf = (r: Row) => (r.leaderboard_opt_in ? (r.display_name || "Owl") : "Anonymous Owl");

  return (
    <div className="bg-aurora min-h-[calc(100vh-3rem)] p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-warning/30 px-3 py-1 text-xs font-semibold text-warning-foreground">
            <Crown className="h-3.5 w-3.5" /> Leaderboard
          </div>
          <h1 className="font-display text-4xl font-bold text-gradient">Climb the ranks 🦉</h1>
          <p className="mt-1 text-sm text-muted-foreground">Top 50 learners. You're never publicly named unless you opt in.</p>
        </header>

        <div className="flex items-center justify-end gap-2 rounded-2xl border bg-card p-3 shadow-pop">
          <span className="text-xs text-muted-foreground">Show my name publicly</span>
          <Switch checked={optIn} onCheckedChange={toggleOpt} />
        </div>

        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList className="grid w-full grid-cols-4">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                <t.icon className="mr-1 h-3.5 w-3.5" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.id} value={t.id} className="space-y-2">
              {rows.length === 0 && (
                <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-pop">
                  No-one on the board yet. Be the first!
                </div>
              )}
              {rows.map((r, i) => {
                const mine = r.user_id === user?.id;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
                return (
                  <div
                    key={r.user_id}
                    className={`flex items-center justify-between rounded-2xl border bg-card p-3 shadow-pop transition ${mine ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-sm font-bold">{medal}</span>
                      <div>
                        <div className="font-semibold">{nameOf(r)}{mine && " (you)"}</div>
                        <div className="text-xs text-muted-foreground">Level {Math.max(1, Math.floor(Math.sqrt(r.xp / 50)) + 1)}</div>
                      </div>
                    </div>
                    <div className="font-display text-lg font-bold text-primary">{valueOf(r)}{t.id === "streak_count" ? " 🔥" : " XP"}</div>
                  </div>
                );
              })}

              {me && !rows.find((r) => r.user_id === me.user_id) && (
                <>
                  <div className="text-center text-xs text-muted-foreground">… your position …</div>
                  <div className="flex items-center justify-between rounded-2xl border bg-card p-3 shadow-pop ring-2 ring-primary">
                    <div className="font-semibold">{nameOf(me)} (you)</div>
                    <div className="font-display text-lg font-bold text-primary">{valueOf(me)}</div>
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/leaderboard" }],mport { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Crown, Flame, Beaker, Zap } from "lucide-react";
import { awardBadge } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [
    { title: "Leaderboard — Sasha AI" },
    { name: "description", content: "See where you rank on the Sasha AI leaderboard for XP, weekly XP, lab XP and study streaks." },
    { property: "og:title", content: "Leaderboard — Sasha AI" },
    { property: "og:description", content: "Compete with other students on XP, weekly XP, lab XP and study streaks." },
    { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/leaderboard" },
  ] }),
  component: LeaderboardPage,
});

type Row = {
  user_id: string;
  display_name: string | null;
  xp: number;
  lab_xp: number;
  xp_week: number;
  streak_count: number;
  leaderboard_opt_in: boolean;
};

type Metric = "xp" | "xp_week" | "lab_xp" | "streak_count";
const TABS: { id: Metric; label: string; icon: any }[] = [
  { id: "xp_week", label: "This week", icon: Zap },
  { id: "xp", label: "All-time XP", icon: Crown },
  { id: "lab_xp", label: "Lab XP", icon: Beaker },
  { id: "streak_count", label: "Streak", icon: Flame },
];

function LeaderboardPage() {
  const { user } = useAuth();
  const [metric, setMetric] = useState<Metric>("xp_week");
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<Row | null>(null);
  const [optIn, setOptIn] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, xp, lab_xp, xp_week, streak_count, leaderboard_opt_in")
        .eq("leaderboard_opt_in", true)
        .order(metric, { ascending: false })
        .limit(50) as any;
      setRows((data ?? []) as Row[]);
    })();
  }, [metric]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("user_id, display_name, xp, lab_xp, xp_week, streak_count, leaderboard_opt_in")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) { setMe(data as Row); setOptIn(!!data.leaderboard_opt_in); }
      });
  }, [user]);

  useEffect(() => {
    if (!user || rows.length === 0) return;
    const idx = rows.findIndex((r) => r.user_id === user.id);
    if (idx >= 0 && idx < 10) awardBadge(user.id, "leaderboard_top10");
  }, [rows, user]);

  const toggleOpt = async (v: boolean) => {
    setOptIn(v);
    if (user) {
      await supabase.from("profiles").update({ leaderboard_opt_in: v } as any).eq("user_id", user.id);
    }
  };

  const valueOf = (r: Row) => r[metric] ?? 0;
  const nameOf = (r: Row) => (r.leaderboard_opt_in ? (r.display_name || "Owl") : "Anonymous Owl");

  return (
    <div className="bg-aurora min-h-[calc(100vh-3rem)] p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-warning/30 px-3 py-1 text-xs font-semibold text-warning-foreground">
            <Crown className="h-3.5 w-3.5" /> Leaderboard
          </div>
          <h1 className="font-display text-4xl font-bold text-gradient">Climb the ranks 🦉</h1>
          <p className="mt-1 text-sm text-muted-foreground">Top 50 learners. You're never publicly named unless you opt in.</p>
        </header>

        <div className="flex items-center justify-end gap-2 rounded-2xl border bg-card p-3 shadow-pop">
          <span className="text-xs text-muted-foreground">Show my name publicly</span>
          <Switch checked={optIn} onCheckedChange={toggleOpt} />
        </div>

        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList className="grid w-full grid-cols-4">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                <t.icon className="mr-1 h-3.5 w-3.5" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.id} value={t.id} className="space-y-2">
              {rows.length === 0 && (
                <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-pop">
                  No-one on the board yet. Be the first!
                </div>
              )}
              {rows.map((r, i) => {
                const mine = r.user_id === user?.id;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
                return (
                  <div
                    key={r.user_id}
                    className={`flex items-center justify-between rounded-2xl border bg-card p-3 shadow-pop transition ${mine ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-sm font-bold">{medal}</span>
                      <div>
                        <div className="font-semibold">{nameOf(r)}{mine && " (you)"}</div>
                        <div className="text-xs text-muted-foreground">Level {Math.max(1, Math.floor(Math.sqrt(r.xp / 50)) + 1)}</div>
                      </div>
                    </div>
                    <div className="font-display text-lg font-bold text-primary">{valueOf(r)}{t.id === "streak_count" ? " 🔥" : " XP"}</div>
                  </div>
                );
              })}

              {me && !rows.find((r) => r.user_id === me.user_id) && (
                <>
                  <div className="text-center text-xs text-muted-foreground">… your position …</div>
                  <div className="flex items-center justify-between rounded-2xl border bg-card p-3 shadow-pop ring-2 ring-primary">
                    <div className="font-semibold">{nameOf(me)} (you)</div>
                    <div className="font-display text-lg font-bold text-primary">{valueOf(me)}</div>
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
