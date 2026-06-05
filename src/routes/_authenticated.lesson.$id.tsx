import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Sparkles, Check, X, Loader2 } from "lucide-react";
import { addXp, awardBadge } from "@/lib/gamification";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lesson/$id")({
  head: () => ({ meta: [{ title: "Lesson — Sasha AI" }] }),
  component: LessonPage,
});

type Slide = { title: string; body: string; emoji?: string };
type Quiz = { question: string; options: string[]; answer_index: number; explanation?: string };

function LessonPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [pathRow, setPathRow] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: p } = await supabase.from("lesson_path").select("*, subjects(name), profiles!inner(grade_level, exam_board)").eq("id", id).maybeSingle();
      // simpler: fetch separately
      const { data: row } = await supabase.from("lesson_path").select("*").eq("id", id).maybeSingle();
      const { data: subj } = row?.subject_id ? await supabase.from("subjects").select("name").eq("id", row.subject_id).maybeSingle() : { data: null } as any;
      const { data: prof } = await supabase.from("profiles").select("grade_level, exam_board").eq("user_id", user.id).maybeSingle();
      setPathRow({ ...row, subject_name: subj?.name, grade_level: prof?.grade_level, exam_board: prof?.exam_board });

      // try existing lesson_content
      const topic = row?.topic || row?.title?.replace(/^(Teach|Quiz|Review):\s*/i, "") || subj?.name || "Intro";
      const { data: lc } = await supabase
        .from("lesson_content")
        .select("*")
        .eq("subject_name", subj?.name || "")
        .eq("topic", topic)
        .eq("grade_level", prof?.grade_level ?? "")
        .eq("exam_board", prof?.exam_board ?? "")
        .limit(1).maybeSingle();
      if (lc) {
        setLesson(lc); setLoading(false); return;
      }
      // ask AI
      try {
        const { data, error } = await supabase.functions.invoke("lesson-draft", {
          body: { subject: subj?.name || "General", topic, grade_level: prof?.grade_level, exam_board: prof?.exam_board },
        });
        if (error) throw error;
        setLesson(data.lesson);
      } catch (e: any) {
        toast.error(e.message || "Could not load lesson");
      } finally { setLoading(false); }
    })();
  }, [id, user]);

  if (loading) return <div className="grid h-[60vh] place-items-center text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading your lesson…</div>;
  if (!lesson) return <div className="p-6">Lesson not available.</div>;

  const slides: Slide[] = lesson.slides ?? [];
  const quiz: Quiz[] = lesson.quiz ?? [];
  const total = slides.length + quiz.length;
  const inSlides = step < slides.length;
  const progress = Math.round(((step + (inSlides ? 0 : (quizIdx))) / Math.max(total, 1)) * 100);

  const finish = async () => {
    if (!user) return;
    await supabase.from("lesson_path").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    const { data: next } = await supabase.from("lesson_path").select("id").eq("user_id", user.id).eq("position", (pathRow.position ?? 0) + 1).maybeSingle();
    if (next) await supabase.from("lesson_path").update({ status: "available" }).eq("id", next.id);
    await addXp(user.id, 30);
    await awardBadge(user.id, "lesson_complete");
    toast.success(`+30 XP · ${correct}/${quiz.length} correct`);
    setDone(true);
  };

  if (done) {
    return (
      <div className="container mx-auto max-w-xl p-8 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-4 font-display text-3xl font-semibold">Lesson complete!</h1>
        <p className="mt-2 text-muted-foreground">{correct} of {quiz.length} correct · +30 XP</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => nav({ to: "/path" })}>Back to study path</Button>
          <Button variant="outline" onClick={() => nav({ to: "/dashboard" })}>Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={() => nav({ to: "/path" })}><ChevronLeft className="h-4 w-4" /></Button>
        <Progress value={progress} className="flex-1" />
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>

      {inSlides ? (
        <Card className="p-8">
          <div className="text-5xl">{slides[step]?.emoji || "✨"}</div>
          <h2 className="mt-4 font-display text-2xl font-semibold">{slides[step]?.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-foreground/90">{slides[step]?.body}</p>
          {step === slides.length - 1 && lesson.worked_example && (
            <div className="mt-4 rounded-lg border bg-muted/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Worked example</p>
              <p className="whitespace-pre-wrap text-sm">{lesson.worked_example}</p>
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={() => setStep(step + 1)}>
              {step === slides.length - 1 ? <>Start quiz <Sparkles className="ml-1 h-4 w-4" /></> : <>Next <ChevronRight className="ml-1 h-4 w-4" /></>}
            </Button>
          </div>
        </Card>
      ) : quiz.length === 0 ? (
        <Card className="p-8 text-center">
          <p>No quiz for this lesson.</p>
          <Button className="mt-4" onClick={finish}>Mark complete</Button>
        </Card>
      ) : (
        <Card className="p-8">
          <p className="text-xs uppercase text-muted-foreground">Question {quizIdx + 1} of {quiz.length}</p>
          <h3 className="mt-2 font-display text-xl">{quiz[quizIdx].question}</h3>
          <div className="mt-4 space-y-2">
            {quiz[quizIdx].options.map((opt, i) => {
              const isAns = i === quiz[quizIdx].answer_index;
              const show = picked !== null;
              return (
                <button
                  key={i}
                  disabled={picked !== null}
                  onClick={() => { setPicked(i); if (isAns) setCorrect(correct + 1); }}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${
                    show && isAns ? "border-green-500 bg-green-500/10"
                    : show && picked === i ? "border-destructive bg-destructive/10"
                    : "hover:bg-muted"
                  }`}
                >
                  <span>{opt}</span>
                  {show && isAns && <Check className="h-4 w-4 text-green-600" />}
                  {show && picked === i && !isAns && <X className="h-4 w-4 text-destructive" />}
                </button>
              );
            })}
          </div>
          {picked !== null && quiz[quizIdx].explanation && (
            <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm"><b>Why:</b> {quiz[quizIdx].explanation}</div>
          )}
          {picked !== null && (
            <div className="mt-4 flex justify-end">
              {quizIdx < quiz.length - 1 ? (
                <Button onClick={() => { setQuizIdx(quizIdx + 1); setPicked(null); }}>Next question <ChevronRight className="ml-1 h-4 w-4" /></Button>
              ) : (
                <Button onClick={finish}>Finish lesson <Check className="ml-1 h-4 w-4" /></Button>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
