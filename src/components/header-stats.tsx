import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Heart, Flame, Zap } from "lucide-react";
import { levelInfo, refillHeartsIfDue } from "@/lib/gamification";
import { Link } from "@tanstack/react-router";

type S = { xp: number; level: number; hearts: number; streak_count: number };

export function HeaderStats() {
  const { user } = useAuth();
  const [s, setS] = useState<S | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      await refillHeartsIfDue(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("xp, level, hearts, streak_count")
        .eq("user_id", user.id)
        .maybeSingle();
      if (mounted && data) setS(data as S);
    };
    load();
    const ch = supabase
      .channel(`profile-stats-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as any;
          setS({ xp: n.xp, level: n.level, hearts: n.hearts, streak_count: n.streak_count });
        },
      )
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  if (!s) return null;
  const li = levelInfo(s.xp);

  return (
    <div className="flex items-center gap-2 text-xs">
      <Link to="/achievements" className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground hover:bg-secondary/80">
        <Zap className="h-3.5 w-3.5 text-accent" />
        <span>Lvl {li.level}</span>
        <div className="ml-1 h-1.5 w-14 overflow-hidden rounded-full bg-background">
          <div className="h-full bg-accent" style={{ width: `${li.pct}%` }} />
        </div>
        <span className="text-muted-foreground">{li.into}/{li.span}</span>
      </Link>
      <div className="flex items-center gap-0.5 rounded-full bg-secondary px-2.5 py-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Heart key={i} className={`h-3.5 w-3.5 ${i < s.hearts ? "fill-destructive text-destructive" : "text-muted-foreground/40"}`} />
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 font-medium text-warning-foreground">
        <Flame className="h-3.5 w-3.5 text-warning" />
        <span>{s.streak_count}</span>
      </div>
    </div>
  );
}
