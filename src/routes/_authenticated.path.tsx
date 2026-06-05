import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Check, Lock, MessageSquare, ScrollText, BookOpen, Star } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { addXp, awardBadge, bumpChallenge } from "@/lib/gamification";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/path")({
  component: PathPage,
});

type Lesson = {
  id: string; subject_id: string | null; position: number;
  activity: "teach" | "quiz" | "review"; title: string; est_minutes: number;
  status: "locked" | "available" | "done";
  content?: string | null; lesson_steps?: string[] | null; practice_prompt?: string | null;
};
type Subject = { id: string; name: string; color: string; strength_score: number };

const lessonContent = (subject: Subject, activity: Lesson["activity"]) => {
  const focus = subject.strength_score < 45 ? "core basics" : subject.strength_score < 70 ? "exam application" : "high-mark practice";
  return {
    content: `${activity === "quiz" ? "Practice" : activity === "review" ? "Review" : "Learn"} ${subject.name} through ${focus}. Sasha AI will connect the lesson to your chosen subject, then check whether you can explain and apply it.` ,
    lesson_steps: [
      `Recall the main ${subject.name} idea in your own words.`,
      `Work through one guided example from your level.`,
      `Answer a short exam-style question and fix mistakes.`,
    ],
    practice_prompt: `Create one ${subject.name} question on today's weakest topic, then mark my answer strictly.`,
  };
};

export async function generatePathFor(userId: string) {
  const { data: subs } = await supabase
    .from("subjects").select("id, name, strength_score, color")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return;
  // Weighted picks: weaker → more frequent
  const weighted: Subject[] = [];
  subs.forEach((s: any) => {
    const w = Math.max(2, Math.ceil((100 - s.strength_score) / 15));
    for (let i = 0; i < w; i++) weighted.push(s);
  });
  const activities: Lesson["activity"][] = ["teach", "quiz", "review"];
  const rows: any[] = [];
  for (let i = 0; i < 14; i++) {
    const s = weighted[Math.floor(Math.random() * weighted.length)];
    const act = activities[i % 3];
    const details = lessonContent(s, act);
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

  const load = async () => {
    if (!user) return;
    const [{ data: subs }, { data: ls }] = await Promise.all([
      supabase.from("subjects").select("id, name, color, strength_score").eq("user_id", user.id),
      supabase.from("lesson_path").select("*").eq("user_id", user.id).order("position"),
    ]);
    const map: Record<string, Subject> = {};
    (subs ?? []).forEach((s: any) => (map[s.id] = s));
    setSubjects(map);
    if (!ls || ls.length === 0) {
      await generatePathFor(user.id);
      const { data: ls2 } = await supabase.from("lesson_path").select("*").eq("user_id", user.id).order("position");
      setLessons((ls2 as Lesson[]) ?? []);
    } else {
      setLessons(ls as Lesson[]);
    }
  };

  useEffect(() => { load(); }, [user]);

  const start = async (l: Lesson) => {
    if (l.status === "locked") return;
    if (l.status === "done") return;
    // Route to activity
    if (l.activity === "teach" || l.activity === "review") {
      nav({ to: "/tutor", search: { subject: l.subject_id ?? undefined } as any });
    } else {
      nav({ to: "/quiz/new", search: { subject: l.subject_id ?? undefined } as any });
    }
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

  return (
    <div className="container mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your study path</h1>
          <p className="text-sm text-muted-foreground">One lesson at a time. Unlock the next as you finish.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>Regenerate path</Button>
      </div>

      <div className="mt-6 flex justify-center">
        <Mascot mood="idle" />
      </div>

      <ol className="relative mt-10 space-y-6">
        {lessons.map((l, i) => {
          const sub = l.subject_id ? subjects[l.subject_id] : null;
          const color = sub?.color ?? "#a78bfa";
          const offset = i % 4 === 0 ? "ml-0" : i % 4 === 1 ? "ml-16" : i % 4 === 2 ? "ml-24" : "ml-8";
          const Icon = l.activity === "quiz" ? ScrollText : l.activity === "teach" ? BookOpen : MessageSquare;
          return (
            <li key={l.id} className={`flex items-center gap-4 ${offset}`}>
              <button
                onClick={() => start(l)}
                disabled={l.status === "locked"}
                className="relative grid h-20 w-20 place-items-center rounded-full text-white shadow-card transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: l.status === "done"
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : l.status === "available"
                    ? `linear-gradient(135deg, ${color}, #7c3aed)`
                    : "linear-gradient(135deg, #94a3b8, #64748b)",
                  boxShadow: l.status === "available" ? `0 0 0 4px ${color}33, 0 8px 24px ${color}55` : undefined,
                }}
              >
                {l.status === "done" ? <Check className="h-8 w-8" />
                  : l.status === "locked" ? <Lock className="h-6 w-6" />
                  : <Icon className="h-8 w-8" />}
                {l.status === "available" && (
                  <span className="absolute inset-0 animate-ping rounded-full" style={{ background: color, opacity: 0.25 }} />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{l.title}</p>
                  {sub && <span className="text-xs text-muted-foreground">• {sub.name}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{l.est_minutes} min · {l.activity}</p>
                {l.content && <p className="mt-1 text-sm text-muted-foreground">{l.content}</p>}
                {!!l.lesson_steps?.length && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {l.lesson_steps.map((step) => <li key={step}>{step}</li>)}
                  </ul>
                )}
                {l.practice_prompt && <p className="mt-2 text-xs font-medium text-foreground">Practice: {l.practice_prompt}</p>}
                {l.status === "available" && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => start(l)}>Start</Button>
                    <Button size="sm" variant="outline" onClick={() => markDone(l)}>Mark done</Button>
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
