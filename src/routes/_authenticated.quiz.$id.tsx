import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quiz/$id")({
  component: QuizPage,
});

type Question = {
  type: "mcq" | "short";
  prompt: string;
  choices?: string[];
  correct_answer: string;
  explanation: string;
};

type GradeResult = { index: number; is_correct: boolean; feedback: string };

const GRADE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-grade`;

function QuizPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topic, setTopic] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<GradeResult[] | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [score, setScore] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("topic, questions, answers, feedback, score, completed")
        .eq("id", id)
        .maybeSingle();
      if (!data) return;
      setTopic(data.topic);
      setQuestions((data.questions as Question[]) ?? []);
      setAnswers((data.answers as string[]) ?? Array((data.questions as any[])?.length ?? 0).fill(""));
      if (data.completed && data.feedback) {
        const fb = data.feedback as any;
        setResults(fb.results ?? []);
        setSummary(fb.summary ?? "");
        setScore(data.score ?? null);
        setCompleted(true);
      }
    })();
  }, [id]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const resp = await fetch(GRADE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ questions, answers }),
      });
      if (!resp.ok) throw new Error("Grading failed");
      const data = await resp.json();
      const res: GradeResult[] = data.results ?? [];
      const sc = res.filter((r) => r.is_correct).length;
      setResults(res);
      setSummary(data.summary ?? "");
      setScore(sc);
      setCompleted(true);

      await supabase.from("quizzes").update({
        answers, feedback: data, score: sc, completed: true,
      }).eq("id", id);

      // Bump subject mastery
      const { data: quiz } = await supabase.from("quizzes").select("subject_id").eq("id", id).maybeSingle();
      if (quiz?.subject_id) {
        const pct = sc / questions.length;
        const delta = Math.round((pct - 0.5) * 10); // -5 .. +5
        const { data: s } = await supabase.from("subjects").select("strength_score").eq("id", quiz.subject_id).maybeSingle();
        if (s) {
          await supabase.from("subjects")
            .update({ strength_score: Math.max(0, Math.min(100, s.strength_score + delta)) })
            .eq("id", quiz.subject_id);
        }
      }
      await supabase.from("study_logs").insert({ user_id: user.id, activity: "quiz", minutes: 8 });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  if (!questions.length) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="container mx-auto max-w-3xl px-6 py-8">
      <Link to="/quiz" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All quizzes
      </Link>
      <h1 className="font-display text-3xl font-semibold">{topic}</h1>
      {completed && score !== null && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
              <p className="font-display text-3xl font-semibold">
                {score} / {questions.length}
              </p>
            </div>
            <Badge className={score === questions.length ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
              Graded
            </Badge>
          </div>
          {summary && <p className="mt-3 text-sm text-muted-foreground">{summary}</p>}
        </div>
      )}

      <ol className="mt-6 space-y-4">
        {questions.map((q, i) => {
          const r = results?.[i];
          return (
            <li key={i} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="font-medium"><span className="text-muted-foreground">{i + 1}.</span> {q.prompt}</p>
                {r && (
                  r.is_correct
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    : <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                )}
              </div>
              {q.type === "mcq" && q.choices ? (
                <div className="space-y-2">
                  {q.choices.map((c, ci) => (
                    <label key={ci} className={`flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary ${answers[i] === c ? "bg-secondary" : ""}`}>
                      <input
                        type="radio"
                        name={`q-${i}`}
                        value={c}
                        checked={answers[i] === c}
                        disabled={completed}
                        onChange={() => {
                          const copy = [...answers]; copy[i] = c; setAnswers(copy);
                        }}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <Textarea
                  value={answers[i] ?? ""}
                  onChange={(e) => { const copy = [...answers]; copy[i] = e.target.value; setAnswers(copy); }}
                  disabled={completed}
                  placeholder="Your answer…"
                />
              )}
              {r && (
                <div className="mt-3 space-y-1 rounded-lg bg-secondary p-3 text-sm">
                  <p><span className="font-medium">Feedback:</span> {r.feedback}</p>
                  <p className="text-muted-foreground"><span className="font-medium">Model answer:</span> {q.correct_answer}</p>
                  <p className="text-muted-foreground"><span className="font-medium">Why:</span> {q.explanation}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!completed && (
        <div className="mt-6 flex justify-end">
          <Button size="lg" onClick={submit} disabled={busy || answers.some((a) => !a?.trim())}>
            {busy ? "Marking strictly…" : "Submit for strict marking"}
          </Button>
        </div>
      )}
    </div>
  );
}
