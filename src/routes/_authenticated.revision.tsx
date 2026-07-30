import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MessageSquare, ScrollText } from "lucide-react";

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
  }),
  component: Revision,
});

type Subject = { id: string; name: string; strength_score: number };

function Revision() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("subjects").select("id, name, strength_score").eq("user_id", user.id)
      .order("strength_score", { ascending: true })
      .then(({ data }) => setSubjects(data ?? []));
  }, [user]);

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-3xl font-semibold">Revision</h1>
      <p className="text-sm text-muted-foreground">Topic-by-topic mastery — focus on the lowest bars first.</p>

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
        {subjects.length === 0 && (
          <p className="text-sm text-muted-foreground">Add subjects in study setup.</p>
        )}
      </div>
    </div>
  );
}
