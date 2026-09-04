import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Check, Lock, MessageSquare, ScrollText, BookOpen, Star } from "lucide-react";
import { PageLoading, ErrorState } from "@/components/ui/states";
import { TalkingFalcon } from "@/components/talking-falcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Film } from "lucide-react";

const VIDEO_STYLES = [
  { id: "cartoon", label: "🎬 Cartoon" },
  { id: "whiteboard", label: "📝 Whiteboard" },
  { id: "talkinghead", label: "🎤 Talking head" },
  { id: "meme", label: "🤣 Meme recap" },
  { id: "lab", label: "🧪 Lab demo" },
];
import { addXp, awardBadge, bumpChallenge } from "@/lib/gamification";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/path")({
  head: () => ({
    meta: [
      { title: "Your Study Path — Sasha AI" },
      { name: "description", content: "A personalised lesson-by-lesson study path built around your subjects, board and exam date." },
      { property: "og:title", content: "Your Study Path — Sasha AI" },
      { property: "og:description", content: "A personalised lesson-by-lesson study path built around your subjects, board and exam date." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/path" }],
  }),
  component: PathPage,
});

type Lesson = {
  id: string; subject_id: string | null; position: number;
  activity: "teach" | "quiz" | "review"; title: string; est_minutes: number;
  status: "locked" | "available" | "done";
  content?: string | null; lesson_steps?: string[] | null; practice_prompt?: string | null;
};
type Subject = { id: string; name: string; color: string; strength_score: number };

export type PathMode = "balanced" | "crash" | "mastery" | "weak";

export const PATH_MODES: { id: PathMode; label: string; blurb: string; lessons: number }[] = [
  { id: "balanced", label: "Balanced", blurb: "Teach, quiz and review in a steady rotation.", lessons: 14 },
  { id: "crash", label: "Exam sprint", blurb: "Short, quiz-heavy run for the days before a paper.", lessons: 8 },
  { id: "mastery", label: "Deep mastery", blurb: "Longer teaching stops, then applied practice.", lessons: 18 },
  { id: "weak", label: "Weak spots only", blurb: "Everything aimed at your lowest-scoring topics.", lessons: 12 },
];

const lessonContent = (subject: Subject, activity: Lesson["activity"], mode: PathMode) => {
  const focus = subject.strength_score < 45 ? "core basics" : subject.strength_score < 70 ? "exam application" : "high-mark practice";
  const modeLine =
    mode === "crash" ? "Keep it fast: recall, apply, move on." :
    mode === "mastery" ? "Go deep: derive it, explain it, then stretch to harder marks." :
    mode === "weak" ? "This stop targets a topic you keep losing marks on." :
    "Steady progress across teaching, practice and review.";
  return {
    content: `${activity === "quiz" ? "Practice" : activity === "review" ? "Review" : "Learn"} ${subject.name} through ${focus}. ${modeLine}`,
    lesson_steps:
      mode === "mastery"
        ? [
            `Explain the core ${subject.name} idea from first principles.`,
            `Work two contrasting examples, one deliberately harder.`,
            `Answer a full exam question and self-mark against the scheme.`,
            `Write one sentence on what you'd do differently next time.`,
          ]
        : mode === "crash"
        ? [
            `Skim the key ${subject.name} facts for 2 minutes.`,
            `Do a rapid exam-style question under time.`,
            `Fix only the marks you dropped.`,
          ]
        : [
            `Recall the main ${subject.name} idea in your own words.`,
            `Work through one guided example from your level.`,
            `Answer a short exam-style question and fix mistakes.`,
          ],
    practice_prompt: `Create one ${subject.name} question on today's weakest topic, then mark my answer strictly.`,
  };
};

export async function generatePathFor(
  userId: string,
  opts: { mode?: PathMode; subjectId?: string | null } = {},
) {
  const mode: PathMode = opts.mode ?? "balanced";
  const { data: subs } = await supabase
    .from("subjects").select("id, name, strength_score, color")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return;
  let pool: any[] = subs;
  if (opts.subjectId) pool = subs.filter((s: any) => s.id === opts.subjectId);
  if (mode === "weak" && pool.length > 1) {
    const sorted = [...pool].sort((a: any, b: any) => a.strength_score - b.strength_score);
    pool = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  }
  if (pool.length === 0) pool = subs;
  // Weighted picks: weaker → more frequent
  const weighted: Subject[] = [];
  pool.forEach((s: any) => {
    const w = Math.max(2, Math.ceil((100 - s.strength_score) / 15));
    for (let i = 0; i < w; i++) weighted.push(s);
  });
  const activities: Lesson["activity"][] =
    mode === "crash" ? ["quiz", "teach", "quiz"] :
    mode === "mastery" ? ["teach", "teach", "quiz", "review"] :
    ["teach", "quiz", "review"];
  const total = PATH_MODES.find((m) => m.id === mode)?.lessons ?? 14;
  const rows: any[] = [];
  for (let i = 0; i < total; i++) {
    const s = weighted[Math.floor(Math.random() * weighted.length)];
    const act = activities[i % activities.length];
    const details = lessonContent(s, act, mode);
    rows.push({
      user_id: userId,
      subject_id: s.id,
      position: i,
      activity: act,
      title:
        act === "teach" ? `Teach: ${s.name}` :
        act === "quiz" ? `Quiz: ${s.name}` :
        `Review: ${s.name}`,
      est_minutes: act === "quiz" ? 8 : 10,
      status: i === 0 ? "available" : "locked",
      ...details,
    });
  }
  await supabase.from("lesson_path").insert(rows);
}

function PathPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject>>({});

  const [noSubjects, setNoSubjects] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setError(null);
    let subs: any[] | null = null;
    let ls: any[] | null = null;
    try {
      const [{ data: s1, error: e1 }, { data: s2, error: e2 }] = await Promise.all([
        supabase.from("subjects").select("id, name, color, strength_score").eq("user_id", user.id),
        supabase.from("lesson_path").select("*").eq("user_id", user.id).order("position"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      subs = s1;
      ls = s2;
    } catch (e: any) {
      setError(e.message ?? "Failed to load study path");
      setLoading(false);
      return;
    }
    const map: Record<string, Subject> = {};
    (subs ?? []).forEach((s: any) => (map[s.id] = s));
    setSubjects(map);
    if (!subs || subs.length === 0) {
      setNoSubjects(true);
      setLessons([]);
      setLoading(false);
      return;
    }
    setNoSubjects(false);
    if (!ls || ls.length === 0) {
      setBusy(true);
      try {
        await generatePathFor(user.id);
        const { data: ls2, error: err } = await supabase.from("lesson_path").select("*").eq("user_id", user.id).order("position");
        if (err) throw err;
        setLessons((ls2 as Lesson[]) ?? []);
        if (!ls2 || ls2.length === 0) toast.error("Couldn't create your path — please try regenerating.");
      } catch (e: any) {
        toast.error(e.message ?? "Failed to build study path");
      } finally { setBusy(false); setLoading(false); }
    } else {
      setLessons(ls as Lesson[]);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  if (loading) return <PageLoading label="Loading your study path…" />;
  if (error) return (
    <div className="container mx-auto max-w-3xl px-6 py-8">
      <ErrorState description={error} onRetry={load} />
    </div>
  );

  const start = async (l: Lesson) => {
    if (l.status === "locked") return;
    if (l.status === "done") return;
    nav({ to: "/lesson/$id", params: { id: l.id } });
  };

  const markDone = async (l: Lesson) => {
    if (!user) return;
    await supabase.from("lesson_path")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", l.id);
    // Unlock next
    const next = lessons.find((x) => x.position === l.position + 1);
    if (next && next.status === "locked") {
      await supabase.from("lesson_path").update({ status: "available" }).eq("id", next.id);
    }
    await addXp(user.id, 25);
    await bumpChallenge(user.id, "lessons2");
    await awardBadge(user.id, "path_lesson_1");
    toast.success("Lesson complete +25 XP");
    load();
  };

  const reset = async () => {
    if (!user) return;
    await supabase.from("lesson_path").delete().eq("user_id", user.id);
    load();
  };

  const doneCount = lessons.filter((l) => l.status === "done").length;
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;
  const totalMins = lessons.filter((l) => l.status !== "done").reduce((t, l) => t + (l.est_minutes ?? 0), 0);
  const nextUp = lessons.find((l) => l.status === "available");

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Roadmap</p>
          <h1 className="font-display text-3xl font-semibold">Your study path</h1>
          <p className="text-sm text-muted-foreground">One lesson at a time. Each finished stop unlocks the next.</p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} disabled={busy || noSubjects}>Regenerate path</Button>
      </header>

      {noSubjects && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <p className="font-display text-lg font-semibold">Set up your subjects first</p>
          <p className="mt-1 text-sm text-muted-foreground">Sasha needs to know what you study before building a path.</p>
          <Button className="mt-4" onClick={() => nav({ to: "/onboarding" })}>Go to study setup</Button>
        </div>
      )}

      {!noSubjects && lessons.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="font-display text-2xl font-semibold">{doneCount}/{lessons.length}</p>
                <p className="text-xs text-muted-foreground">Lessons complete</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold">{pct}%</p>
                <p className="text-xs text-muted-foreground">Path progress</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold">{totalMins}m</p>
                <p className="text-xs text-muted-foreground">Time remaining</p>
              </div>
            </div>
            <TalkingFalcon
              compact
              lines={[
                nextUp ? `Next up: ${nextUp.title}. Roughly ${nextUp.est_minutes} minutes.` : "Path complete — regenerate for a fresh run.",
                `You're ${pct}% through. I'll perch on every stop with you.`,
                `Pick a video style per lesson — cartoon if you're tired, whiteboard if you're locked in.`,
              ]}
            />
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-gradient-to-r from-falcon-gold to-falcon-gold-deep transition-all" style={{ width: `${pct}%` }} />
          </div>
          {nextUp && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-falcon-gold/40 bg-falcon-soft/60 p-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Do this now</p>
                <p className="text-sm font-semibold">{nextUp.title}</p>
              </div>
              <Button size="sm" onClick={() => start(nextUp)}>Start lesson</Button>
            </div>
          )}
        </section>
      )}

      <ol className="relative mt-8 space-y-3 border-l border-border pl-6 sm:pl-8">
        {lessons.map((l) => {
          const sub = l.subject_id ? subjects[l.subject_id] : null;
          const color = sub?.color ?? "#a78bfa";
          const Icon = l.activity === "quiz" ? ScrollText : l.activity === "teach" ? BookOpen : MessageSquare;
          const styleKey = `sasha:videoStyle:${l.id}`;
          const currentStyle = (typeof window !== "undefined" && localStorage.getItem(styleKey)) || (typeof window !== "undefined" && localStorage.getItem("sasha:videoStyle")) || "cartoon";
          const locked = l.status === "locked";
          return (
            <li key={l.id} className="relative">
              <span
                className="absolute -left-[2.15rem] top-5 grid h-9 w-9 place-items-center rounded-full border-2 border-background text-white shadow-card sm:-left-[2.65rem]"
                style={{
                  background: l.status === "done"
                    ? "linear-gradient(135deg,#22c55e,#16a34a)"
                    : l.status === "available"
                    ? `linear-gradient(135deg, ${color}, #7c3aed)`
                    : "hsl(var(--muted))",
                  boxShadow: l.status === "available" ? `0 0 0 4px ${color}25` : undefined,
                }}
              >
                {l.status === "done" ? <Check className="h-4 w-4" /> : locked ? <Lock className="h-3.5 w-3.5" /> : <Icon className="h-4 w-4" />}
              </span>

              <div className={`rounded-2xl border bg-card p-4 shadow-card transition ${
                l.status === "available" ? "border-falcon-gold/50" : locked ? "border-border opacity-60" : "border-border"
              }`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{l.title}</p>
                  {sub && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{sub.name}</span>}
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">{l.activity}</span>
                  <span className="text-xs text-muted-foreground">{l.est_minutes} min</span>
                </div>
                {l.content && <p className="mt-2 text-sm text-muted-foreground">{l.content}</p>}
                {!!l.lesson_steps?.length && !locked && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {l.lesson_steps.map((step) => <li key={step}>{step}</li>)}
                  </ul>
                )}
                {l.practice_prompt && !locked && <p className="mt-2 text-xs font-medium text-foreground">Practice: {l.practice_prompt}</p>}
                {!locked && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {l.status === "available" && <Button size="sm" onClick={() => start(l)}>Start</Button>}
                    {l.status === "available" && <Button size="sm" variant="outline" onClick={() => markDone(l)}>Mark done</Button>}
                    <span className="ml-auto flex items-center gap-2">
                      <Film className="h-3.5 w-3.5 text-muted-foreground" />
                      <Select defaultValue={currentStyle} onValueChange={(v) => localStorage.setItem(styleKey, v)}>
                        <SelectTrigger className="h-8 w-40 text-xs" aria-label="Lesson video style"><SelectValue /></SelectTrigger>
                        <SelectContent>{VIDEO_STYLES.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {lessons.length > 0 && lessons.every((l) => l.status === "done") && (
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <Star className="mx-auto h-8 w-8 text-warning" />
          <p className="mt-2 font-display text-xl font-semibold">Path complete!</p>
          <p className="text-sm text-muted-foreground">Generate a fresh path to keep going.</p>
          <Button className="mt-3" onClick={reset}>Regenerate</Button>
        </div>
      )}
    </div>
  );
}
