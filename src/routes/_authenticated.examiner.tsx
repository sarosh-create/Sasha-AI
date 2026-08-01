import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Stamp, BookMarked, Gavel } from "lucide-react";

export const Route = createFileRoute("/_authenticated/examiner")({
  component: Examiner,
  head: () => ({
    meta: [
      { title: "Examiner Twin — Strict AI marking | Sasha AI" },
      { name: "description", content: "Paste any exam-style answer and the Examiner Twin marks it exactly like a real examiner — with mark breakdown, missing keywords, and a personalised mistake journal." },
      { property: "og:title", content: "Examiner Twin — Strict AI marking | Sasha AI" },
      { property: "og:description", content: "Paste any exam-style answer and the Examiner Twin marks it exactly like a real examiner — with mark breakdown, missing keywords, and a personalised mistake journal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/examiner" }],
  }),
});

type Mark = {
  marks_awarded: number; max_marks: number; grade_band?: string;
  mark_breakdown: { point: string; awarded: boolean; reason: string }[];
  missing_keywords: string[]; examiner_comments: string; model_answer: string;
  mistake_topic?: string; why_wrong?: string;
};

const FN = (n: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${n}`;

function Examiner() {
  const { user, session } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [maxMarks, setMaxMarks] = useState(6);
  const [subject, setSubject] = useState("General");
  const [examBoard, setExamBoard] = useState("general");
  const [result, setResult] = useState<Mark | null>(null);
  const [busy, setBusy] = useState(false);
  const [journal, setJournal] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("exam_board").eq("user_id", user.id).maybeSingle().then(({ data }) => { if (data?.exam_board) setExamBoard(data.exam_board); });
      supabase.from("mistake_journal").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10).then(({ data }) => setJournal(data ?? []));
    }
  }, [user]);

  const mark = async () => {
    if (!question.trim() || !answer.trim()) { toast.error("Add a question and your answer first."); return; }
    setBusy(true);
    try {
      const r = await fetch(FN("examiner-twin"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ question, answer, max_marks: maxMarks, subject, examBoard }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Marking failed");
      const j: Mark = await r.json();
      setResult(j);
      if (user && (j.marks_awarded < j.max_marks)) {
        await supabase.from("mistake_journal").insert({
          user_id: user.id,
          topic: j.mistake_topic ?? subject,
          question, student_answer: answer, correct_answer: j.model_answer,
          why_wrong: j.why_wrong ?? j.examiner_comments,
          marks_lost: Math.max(0, j.max_marks - j.marks_awarded),
        });
        const { data } = await supabase.from("mistake_journal").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
        setJournal(data ?? []);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const pct = result ? Math.round((result.marks_awarded / Math.max(result.max_marks, 1)) * 100) : 0;

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center gap-3">
        <Gavel className="h-6 w-6 text-falcon-gold-deep" />
        <h1 className="font-display text-3xl font-semibold">Examiner Twin</h1>
      </div>
      <p className="text-sm text-muted-foreground">Type any exam question and your answer. The Twin marks it like a real examiner.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><Label>Exam board</Label><Input value={examBoard} onChange={(e) => setExamBoard(e.target.value)} /></div>
            <div><Label>Max marks</Label><Input type="number" min={1} max={20} value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} /></div>
          </div>
          <div><Label>Question</Label><Textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Explain how an enzyme's active site is affected by temperature. [6 marks]" /></div>
          <div><Label>Your answer</Label><Textarea rows={8} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your full exam answer here…" /></div>
          <Button size="lg" onClick={mark} disabled={busy}>
            <Stamp className="mr-2 h-4 w-4" /> {busy ? "Marking strictly…" : "Mark my answer"}
          </Button>

          {result && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="rounded-xl bg-falcon-soft p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-falcon-navy/70">Awarded</p>
                    <p className="font-display text-4xl font-semibold text-falcon-navy">{result.marks_awarded}<span className="text-xl text-falcon-navy/60">/{result.max_marks}</span></p>
                  </div>
                  {result.grade_band && <Badge className="bg-falcon-navy text-white">{result.grade_band}</Badge>}
                </div>
                <Progress value={pct} className="mt-3" />
              </div>

              <div>
                <h3 className="font-display text-lg font-semibold">Mark breakdown</h3>
                <ul className="mt-2 space-y-2">
                  {result.mark_breakdown.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-lg border border-border/60 bg-background p-3 text-sm">
                      {b.awarded ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                      <div><p className="font-medium">{b.point}</p><p className="text-xs text-muted-foreground">{b.reason}</p></div>
                    </li>
                  ))}
                </ul>
              </div>

              {result.missing_keywords?.length > 0 && (
                <div>
                  <h3 className="font-display text-lg font-semibold">Missing examiner keywords</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.missing_keywords.map((k, i) => <Badge key={i} variant="outline" className="border-warning/40 text-warning">{k}</Badge>)}
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-secondary p-4 text-sm">
                <p className="font-medium">Examiner comments</p>
                <p className="text-muted-foreground">{result.examiner_comments}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 text-sm">
                <p className="font-medium">Model answer</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{result.model_answer}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2"><BookMarked className="h-4 w-4 text-falcon-gold-deep" /><h3 className="font-display text-lg font-semibold">Mistake journal</h3></div>
            <p className="text-xs text-muted-foreground">Your recent lost-marks log.</p>
            <ul className="mt-3 space-y-2">
              {journal.length === 0 && <li className="text-xs text-muted-foreground">Nothing yet. Mark an answer to start.</li>}
              {journal.map((m) => (
                <li key={m.id} className="rounded-lg border border-border/60 bg-background p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.topic}</span>
                    <Badge variant="outline" className="border-destructive/40 text-destructive">−{m.marks_lost}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.why_wrong}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
