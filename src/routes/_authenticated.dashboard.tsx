import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, MessageSquare, ScrollText, Sparkles, Target, Map, CheckCircle2 } from "lucide-react";
import { TalkingFalcon } from "@/components/talking-falcon";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Study Dashboard — Sasha AI" },
      { name: "description", content: "Your daily study roadmap, streaks, mastery progress, and next lesson — all in one calm dashboard." },
      { property: "og:title", content: "Study Dashboard — Sasha AI" },
      { property: "og:description", content: "Your daily study roadmap, streaks, mastery progress, and next lesson." },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/dashboard" }],
  }),
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
type Lesson = { id: string; title: string; status: string; activity: string; est_minutes: number; subject_id: string | null };
type Challenge = { id: string; code: string; label: string; target: number; progress: number; completed: boolean };

function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [minutesToday, setMinutesToday] = useState(0);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [pathProgress, setPathProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [challenges, setChallenges] = useState<Challenge[]>([]);

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

      const today = new Date().toISOString().slice(0, 10);
      const [{ data: subs }, { data: logs }, { data: path }, { data: ch }] = await Promise.all([
        supabase.from("subjects").select("id, name, strength_score, color").eq("user_id", user.id).order("strength_score", { ascending: true }),
        supabase.from("study_logs").select("minutes, created_at").eq("user_id", user.id).gte("created_at", today),
        supabase.from("lesson_path").select("id, title, status, activity, est_minutes, subject_id").eq("user_id", user.id).order("position"),
        supabase.from("daily_challenges").select("*").eq("user_id", user.id).eq("for_date", today),
      ]);

      setSubjects(subs ?? []);
      setMinutesToday((logs ?? []).reduce((s, l: any) => s + (l.minutes ?? 0), 0));
      const lessons = (path as Lesson[]) ?? [];
      setNextLesson(lessons.find((l) => l.status === "available") ?? null);
      setPathProgress({ done: lessons.filter((l) => l.status === "done").length, total: lessons.length });
      setChallenges((ch as Challenge[]) ?? []);
    })();
  }, [user, nav]);

  if (!profile) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }

  const daysToExam = profile.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Study Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {profile.display_name ?? "friend"} 👋</p>
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
        <StatCard label="Study path" value={`${pathProgress.done} / ${pathProgress.total || "—"}`}>
          <p className="mt-1 text-xs text-muted-foreground">Lessons completed.</p>
        </StatCard>
        <StatCard label="Exam board" value={profile.exam_board ?? "—"}>
          <p className="mt-1 text-xs text-muted-foreground">{profile.exam_date ?? "No exam date set"}</p>
        </StatCard>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Continue path widget */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Continue your path</h2>
            <Link to="/path"><Button variant="ghost" size="sm"><Map className="h-4 w-4" /> Open path</Button></Link>
          </div>
          {nextLesson ? (
            <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl text-white"
                style={{ background: `linear-gradient(135deg, ${subjects.find((s) => s.id === nextLesson.subject_id)?.color ?? "#a78bfa"}, #7c3aed)` }}>
                {nextLesson.activity === "quiz" ? <ScrollText className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
              </div>
              <div className="flex-1">
                <p className="font-display text-lg font-semibold">{nextLesson.title}</p>
                <p className="text-xs text-muted-foreground">{nextLesson.est_minutes} min · {nextLesson.activity}</p>
              </div>
              <Link to="/path"><Button>Start</Button></Link>
            </div>
          ) : pathProgress.total === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No path yet.</p>
              <Link to="/path"><Button className="mt-3" size="sm">Generate path</Button></Link>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">All lessons done! 🎉</p>
              <Link to="/path"><Button className="mt-3" size="sm" variant="outline">Regenerate</Button></Link>
            </div>
          )}

          <h3 className="mt-6 mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Subjects</h3>
          <ul className="space-y-2">
            {subjects.slice(0, 4).map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.strength_score}/100</span>
                <Link to="/tutor" search={{ subject: s.id } as any}><Button size="sm" variant="outline" aria-label={`Open tutor for ${s.name}`}><MessageSquare className="h-3.5 w-3.5" /></Button></Link>
                <Link to="/quiz/new" search={{ subject: s.id } as any}><Button size="sm" aria-label={`Start quiz on ${s.name}`}><ScrollText className="h-3.5 w-3.5" /></Button></Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right column: daily challenges + mascot */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="font-display text-lg font-semibold">Daily challenges</h2>
            </div>
            <ul className="space-y-3">
              {challenges.map((c) => (
                <li key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${c.completed ? "text-muted-foreground line-through" : ""}`}>{c.label}</span>
                    {c.completed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <span className="text-xs text-muted-foreground">{c.progress}/{c.target}</span>}
                  </div>
                  <Progress value={(c.progress / c.target) * 100} className="h-1.5" />
                </li>
              ))}
              {challenges.length === 0 && <p className="text-xs text-muted-foreground">Setting up today's challenges…</p>}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <TalkingFalcon
              name={profile.display_name}
              mood={daysToExam !== null && daysToExam < 14 ? "alert" : "idle"}
              lines={[
                `Hey ${profile.display_name ?? "champ"} — ${minutesToday} of ${profile.daily_minutes_goal} min done today. Let's wing the rest.`,
                nextLesson ? `Next swoop: "${nextLesson.title}" — ${nextLesson.est_minutes} min. I'll guide every step.` : "Path's clear, captain. Let's spin up a fresh one.",
                daysToExam !== null ? `${daysToExam} days till exam. I see the pattern — trust the falcon.` : `Set your exam date in Settings and I'll countdown for you.`,
                `Streak: ${profile.streak_count} 🔥. Don't break my heart, partner.`,
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      {children}
    </div>
  );
}
