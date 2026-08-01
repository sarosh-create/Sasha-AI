import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Plus, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quiz/")({
  head: () => ({
    meta: [
      { title: "Quizzes — Sasha AI" },
      { name: "description", content: "Practise with AI-generated quizzes, typed answers and instant examiner-style marking." },
      { property: "og:title", content: "Quizzes — Sasha AI" },
      { property: "og:description", content: "Practise with AI-generated quizzes, typed answers and instant examiner-style marking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/quiz" }],
  }),
  component: QuizList,
});

type Quiz = {
  id: string; topic: string; score: number | null; total: number;
  completed: boolean; created_at: string; subject_id: string | null;
};

function QuizList() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("quizzes")
      .select("id, topic, score, total, completed, created_at, subject_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setQuizzes(data ?? []));
  }, [user]);

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Quizzes</h1>
          <p className="text-sm text-muted-foreground">Exam-style questions, strictly marked.</p>
        </div>
        <Link to="/quiz/new"><Button><Plus className="h-4 w-4" /> New quiz</Button></Link>
      </div>

      <div className="mt-6 space-y-3">
        {quizzes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <ScrollText className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No quizzes yet — create your first one.</p>
          </div>
        )}
        {quizzes.map((q) => (
          <Link key={q.id} to="/quiz/$id" params={{ id: q.id }}>
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-glow">
              <div>
                <p className="font-medium">{q.topic}</p>
                <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {q.completed ? (
                  <Badge className="gap-1 bg-success text-success-foreground hover:bg-success">
                    <CheckCircle2 className="h-3 w-3" /> {q.score}/{q.total}
                  </Badge>
                ) : (
                  <Badge variant="secondary">In progress</Badge>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
