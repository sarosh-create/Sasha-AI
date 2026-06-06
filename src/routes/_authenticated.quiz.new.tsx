import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quiz/new")({
  component: NewQuiz,
  validateSearch: (s: Record<string, unknown>) => ({
    subject: typeof s.subject === "string" ? s.subject : undefined,
  }),
});

type Subject = { id: string; name: string };

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-generate`;

function NewQuiz() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { subject: presetSubject } = Route.useSearch();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [style, setStyle] = useState<"mix" | "mcq" | "short">("mix");
  const [busy, setBusy] = useState(false);
  const [examBoard, setExamBoard] = useState<string | null>(null);


  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: subs } = await supabase.from("subjects").select("id, name").eq("user_id", user.id);
      setSubjects(subs ?? []);
      if (presetSubject) setSubjectId(presetSubject);
      else if (subs && subs.length) setSubjectId(subs[0].id);
      const { data: p } = await supabase.from("profiles").select("exam_board").eq("user_id", user.id).maybeSingle();
      setExamBoard(p?.exam_board ?? null);
    })();
  }, [user, presetSubject]);

  const generate = async () => {
    if (!user || !topic.trim() || !subjectId) return;
    setBusy(true);
    try {
      const subject = subjects.find((s) => s.id === subjectId)?.name ?? "General";
      const resp = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ subject, topic, count, examBoard, style }),
      });
      if (resp.status === 429) throw new Error("Rate limit — try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted.");
      if (!resp.ok) throw new Error("Failed to generate quiz");
      const data = await resp.json();
      const questions = data.questions ?? [];
      if (!questions.length) throw new Error("No questions generated");
      const { data: inserted, error } = await supabase
        .from("quizzes")
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          topic,
          questions,
          total: questions.length,
        })
        .select("id")
        .single();
      if (error) throw error;
      nav({ to: "/quiz/$id", params: { id: inserted!.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto max-w-xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold">New quiz</h1>
      <p className="text-sm text-muted-foreground">Pick a subject and topic — Sasha AI will write exam-style questions.</p>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div>
          <Label>Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger><SelectValue placeholder="Pick subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="topic">Topic</Label>
          <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Cell respiration, Quadratic equations" />
        </div>
        <div>
          <Label>Number of questions</Label>
          <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[3,5,8,10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Question style</Label>
          <Select value={style} onValueChange={(v) => setStyle(v as "mix" | "mcq" | "short")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mix">Mixed (MCQ + typable)</SelectItem>
              <SelectItem value="mcq">Multiple choice only</SelectItem>
              <SelectItem value="short">Typable answers only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" disabled={busy || !topic.trim()} onClick={generate} size="lg">
          {busy ? "Generating…" : "Generate quiz"}
        </Button>

      </div>
    </div>
  );
}
