import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { BADGES, levelInfo } from "@/lib/gamification";
import { PageLoading, ErrorState } from "@/components/ui/states";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements & Badges — Sasha AI" },
      { name: "description", content: "Track every badge, milestone and XP reward you have unlocked on your study journey." },
      { property: "og:title", content: "Achievements & Badges — Sasha AI" },
      { property: "og:description", content: "Track every badge, milestone and XP reward you have unlocked on your study journey." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/achievements" }],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const { user } = useAuth();
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: a, error: e1 }, { data: p, error: e2 }] = await Promise.all([
        supabase.from("achievements").select("code").eq("user_id", user.id),
        supabase.from("profiles").select("xp").eq("user_id", user.id).maybeSingle(),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setEarned(new Set((a ?? []).map((x: any) => x.code)));
      setXp(p?.xp ?? 0);
    } catch (e: any) {
      setError(e.message ?? "Failed to load achievements");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [user]);

  const li = levelInfo(xp);

  if (loading) return <PageLoading label="Loading achievements…" />;
  if (error) return (
    <div className="container mx-auto max-w-5xl px-6 py-8">
      <ErrorState description={error} onRetry={load} />
    </div>
  );

  return (
    <div className="container mx-auto max-w-5xl px-6 py-8">
      <h1 className="font-display text-3xl font-semibold">Achievements</h1>
      <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Level {li.level}</p>
        <p className="font-display text-2xl font-semibold">{xp} XP</p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-accent" style={{ width: `${li.pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{li.into}/{li.span} XP to level {li.level + 1}</p>
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold">Badges ({earned.size}/{BADGES.length})</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {BADGES.map((b) => {
          const has = earned.has(b.code);
          return (
            <div key={b.code} className={`rounded-2xl border p-5 text-center shadow-card transition ${has ? "border-accent/40 bg-card" : "border-dashed bg-card/40 opacity-60"}`}>
              <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl ${has ? "bg-accent/20" : "bg-muted"}`}>
                {has ? b.emoji : "🔒"}
              </div>
              <p className="mt-2 font-display font-semibold">{b.label}</p>
              <p className="text-xs text-muted-foreground">{b.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
