import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, MessageSquare, ScrollText, Sparkles, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Profile = {
  display_name: string | null;
  exam_board: string | null;
  exam_date: string | null;
  daily_minutes_goal: number;
  streak_count: number;
  last_active_date: string | null;
  onboarded: boolean;
};
type Subject = { id: string; name: string; strength_score: number; color: string };

function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [minutesToday, setMinutesToday] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, exam_board, exam_date, daily_minutes_goal, streak_count, last_active_date, onboarded")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!p || !p.onboarded) {
        nav({ to: "/onboarding" });
        return;
      }
      setProfile(p as Profile);

      const { data: subs } = await supabase
        .from("subjects")
        .select("id, name, strength_score, color")
        .eq("user_id", user.id)
        .order("strength_score", { ascending: true });
      setSubjects(subs ?? []);

      const today = new Date().toISOString().slice(0, 10);
      const { data: logs } = await supabase
        .from("study_logs")
        .select("minutes, created_at")
        .eq("user_id", user.id)
        .gte("created_at", today);
      setMinutesToday((logs ?? []).reduce((s, l: any) => s + (l.minutes ?? 0), 0));
    })();
  }, [user, nav]);

  if (!profile) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }

  const daysToExam = profile.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  // Roadmap: allocate today's minutes weighted by weakness
  const totalWeight = subjects.reduce((s, x) => s + Math.max(10, 100 - x.strength_score), 0) || 1;
  const roadmap = subjects.map((s) => {
    const weight = Math.max(10, 100 - s.strength_score);
    const minutes = Math.max(5, Math.round((weight / totalWeight) * profile.daily_minutes_goal));
    return { ...s, minutes };
  });

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="font-display text-3xl font-semibold">
            Hi {profile.display_name ?? "there"} 👋
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {daysToExam !== null && (
            <Badge variant="secondary" className="gap-1">
              <Target className="h-3 w-3" /> {daysToExam} days to exam
            </Badge>
          )}
          <Badge className="gap-1 bg-warning text-warning-foreground hover:bg-warning">
            <Flame className="h-3 w-3" /> {profile.streak_count} day streak
          </Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Today's goal" value={`${minutesToday} / ${profile.daily_minutes_goal} min`}>
          <Progress value={Math.min(100, (minutesToday / profile.daily_minutes_goal) * 100)} className="mt-3" />
        </StatCard>
        <StatCard label="Subjects" value={`${subjects.length}`}>
          <p className="mt-1 text-xs text-muted-foreground">Tracking your mastery across each.</p>
        </StatCard>
        <StatCard label="Exam board" value={profile.exam_board ?? "—"}>
          <p className="mt-1 text-xs text-muted-foreground">{profile.exam_date ?? "No exam date set"}</p>
        </StatCard>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Today's study roadmap</h2>
            <Link to="/onboarding">
              <Button variant="ghost" size="sm">Adjust plan</Button>
            </Link>
          </div>
          {roadmap.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add subjects to see your roadmap.</p>
          ) : (
            <ul className="space-y-3">
              {roadmap.map((s) => (
                <li key={s.id} className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary font-semibold">
                    {s.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-sm text-muted-foreground">{s.minutes} min</span>
                    </div>
                    <Progress value={s.strength_score} className="mt-2 h-1.5" />
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Mastery {s.strength_score}/100</span>
                      <span>{s.strength_score < 40 ? "Needs focus" : s.strength_score < 70 ? "Building" : "Strong"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/tutor" search={{ subject: s.id } as any}>
                      <Button size="sm" variant="outline"><MessageSquare className="h-3.5 w-3.5" /> Tutor</Button>
                    </Link>
                    <Link to="/quiz/new" search={{ subject: s.id } as any}>
                      <Button size="sm"><ScrollText className="h-3.5 w-3.5" /> Quiz</Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="font-display text-lg font-semibold">Mentor tip</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Start with your weakest subject while your focus is freshest. Aim for one quiz before
            switching topics — short, strict tests cement what you've just learned.
          </p>
          <div className="mt-4 grid gap-2">
            <Link to="/tutor"><Button className="w-full" variant="secondary">Open AI tutor</Button></Link>
            <Link to="/quiz/new"><Button className="w-full">Take a quick quiz</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, children,
}: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      {children}
    </div>
  );
}
