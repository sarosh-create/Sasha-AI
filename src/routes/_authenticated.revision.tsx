import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MessageSquare, ScrollText, BookOpenCheck } from "lucide-react";
import { PageLoading, ErrorState, EmptyState } from "@/components/ui/states";

export const Route = createFileRoute("/_authenticated/revision")({
  head: () => ({
    meta: [
      { title: "Revision Planner — Sasha AI" },
      { name: "description", content: "Spaced-repetition revision sessions that target your weakest topics first." },
      { property: "og:title", content: "Revision Planner — Sasha AI" },
      { property: "og:description", content: "Spaced-repetition revision sessions that target your weakest topics first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/revision" }],
  }),
  component: Revision,
});

type Subject = { id: string; name: string; strength_score: number };

function Revision() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    supabase.from("subjects").select("id, name, strength_score").eq("user_id", user.id)
      .order("strength_score", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setSubjects(data ?? []);
        setLoading(false);
      });
  };
  useEffect(() => { load(); }, [user]);

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-3xl font-semibold">Revision</h1>
      <p className="text-sm text-muted-foreground">Topic-by-topic mastery — focus on the lowest bars first.</p>

      {loading ? (
        <PageLoading className="p-0" label="Loading revision plan…" />
      ) : error ? (
        <ErrorState className="mt-6" description={error} onRetry={load} />
      ) : subjects.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<BookOpenCheck className="h-6 w-6" />}
          title="No subjects yet"
          description="Add subjects in study setup to build a revision plan."
        />
      ) : (
      <div className="mt-6 space-y-3">
        {subjects.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">Mastery {s.strength_score}/100</p>
              </div>
              <div className="flex gap-2">
                <Link to="/tutor"><Button variant="outline" size="sm"><MessageSquare className="h-3.5 w-3.5" /> Revise with tutor</Button></Link>
                <Link to="/quiz/new" search={{ subject: s.id } as any}><Button size="sm"><ScrollText className="h-3.5 w-3.5" /> Quiz me</Button></Link>
              </div>
            </div>
            <Progress value={s.strength_score} className="mt-3" />
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
