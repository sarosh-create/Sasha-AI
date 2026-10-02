import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/states";
import { loadSchedule, upcomingDays, type SavedScheduleDay } from "@/lib/study-schedule-store";
import { Map, CalendarDays, FileText, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-dashboard")({
  component: MyDashboard,
  head: () => ({
    meta: [
      { title: "My Student Dashboard — Sasha AI" },
      { name: "description", content: "Your roadmap progress, study schedule days, past papers taken and paper-checker mistakes in one place." },
      { property: "og:title", content: "My Student Dashboard — Sasha AI" },
      { property: "og:description", content: "Roadmap progress, schedule, past papers and mistakes in one view." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Mistake = { id: string; topic: string; question: string; why_wrong: string | null; marks_lost: number; created_at: string };
type Quiz = { id: string; topic: string; score: number | null; total: number; created_at: string };

function MyDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState({ done: 0, total: 0 });
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [days, setDays] = useState<SavedScheduleDay[]>([]);

  useEffect(() => {
    const s = loadSchedule();
    setDays(s ? upcomingDays(s, 7) : []);
    if (!user) return;
    (async () => {
      const [{ data: lp }, { data: qz }, { data: mj }] = await Promise.all([
        supabase.from("lesson_path").select("status").eq("user_id", user.id),
        supabase.from("quizzes").select("id, topic, score, total, created_at").eq("user_id", user.id).eq("completed", true).order("created_at", { ascending: false }).limit(10),
        supabase.from("mistake_journal").select("id, topic, question, why_wrong, marks_lost, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      const rows = lp ?? [];
      setPath({ done: rows.filter((r) => r.status === "done").length, total: rows.length });
      setQuizzes((qz as Quiz[]) ?? []);
      setMistakes((mj as Mistake[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <PageLoading label="Loading your dashboard" />;
  const pct = path.total ? Math.round((path.done / path.total) * 100) : 0;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-6 py-8">
      <h1 className="font-display text-3xl font-semibold">My student dashboard</h1>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><Map className="h-4 w-4" /> Roadmap progress</h2>
        <p className="text-sm text-muted-foreground">{path.done} of {path.total} lessons done ({pct}%)</p>
        <Progress value={pct} className="mt-2" />
        <Link to="/path"><Button size="sm" variant="outline" className="mt-3">Open study path</Button></Link>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><CalendarDays className="h-4 w-4" /> Study schedule — next 7 days</h2>
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plan yet. <Link to="/study-schedule" className="text-primary underline">Make a study schedule</Link>.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {days.map((d) => (
              <li key={d.iso} className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">{d.label}</p>
                <p className="font-medium">{d.rest ? "Rest day" : `${d.subject} — ${d.focus}`}</p>
                {!d.rest && <p className="text-xs text-muted-foreground">{d.blocks.reduce((s, b) => s + b.minutes, 0)} min · {d.blocks.length} blocks</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><FileText className="h-4 w-4" /> Papers & quizzes taken</h2>
          {quizzes.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
            <ul className="space-y-2">
              {quizzes.map((q) => (
                <li key={q.id} className="flex justify-between rounded-lg border border-border p-2 text-sm">
                  <span className="truncate">{q.topic}</span>
                  <span className="shrink-0 text-muted-foreground">{q.score ?? "–"}/{q.total}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/papers"><Button size="sm" variant="outline" className="mt-3">Past papers</Button></Link>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><AlertTriangle className="h-4 w-4" /> Paper-checker mistakes</h2>
          {mistakes.length === 0 ? <p className="text-sm text-muted-foreground">No mistakes logged yet.</p> : (
            <ul className="space-y-2">
              {mistakes.map((m) => (
                <li key={m.id} className="rounded-lg border border-border p-2 text-sm">
                  <p className="font-medium">{m.topic} <span className="text-xs text-destructive">−{m.marks_lost}</span></p>
                  {m.why_wrong && <p className="text-xs text-muted-foreground">{m.why_wrong}</p>}
                </li>
              ))}
            </ul>
          )}
          <Link to="/paper-checker"><Button size="sm" variant="outline" className="mt-3">Check another paper</Button></Link>
        </section>
      </div>
    </div>
  );
}
