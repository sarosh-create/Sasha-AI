import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Crosshair, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/predictions")({
  component: Predictions,
  head: () => ({ meta: [
    { title: "Exam Predictions — Most likely topics | Sasha AI" },
    { name: "description", content: "AI-ranked 'most likely to appear' topics for your next exam, based on past papers, examiner trends, and your weak areas." },
      { property: "og:title", content: "Exam Predictions — Most likely topics | Sasha AI" },
      { property: "og:description", content: "AI-ranked 'most likely to appear' topics for your next exam, based on past papers, examiner trends, and your weak areas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

const FN = (n: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${n}`;

function Predictions() {
  const { user, session } = useAuth();
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("subjects").select("id, name").eq("user_id", user.id).then(({ data }) => {
      setSubjects(data ?? []);
      if (data?.length) setSubjectId(data[0].id);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !subjectId) return;
    supabase.from("exam_predictions").select("*").eq("user_id", user.id).eq("subject_id", subjectId).order("probability", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [user, subjectId]);

  const predict = async () => {
    if (!subjectId) return;
    setBusy(true);
    try {
      const r = await fetch(FN("exam-predict"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ subject_id: subjectId }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Prediction failed");
      const { data } = await supabase.from("exam_predictions").select("*").eq("user_id", user!.id).eq("subject_id", subjectId).order("probability", { ascending: false });
      setRows(data ?? []);
      toast.success("Predictions refreshed");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center gap-3"><Crosshair className="h-6 w-6 text-falcon-gold-deep" /><h1 className="font-display text-3xl font-semibold">Most likely to appear</h1></div>
      <p className="text-sm text-muted-foreground">The Falcon hunts patterns across past papers and your weak topics.</p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Pick subject" /></SelectTrigger>
          <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={predict} disabled={busy || !subjectId}><Sparkles className="mr-2 h-4 w-4" />{busy ? "Predicting…" : "Run prediction"}</Button>
      </div>

      <div className="mt-6 space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No predictions yet for this subject.</p>}
        {rows.map((r) => {
          const color = r.priority === "critical" ? "destructive" : r.priority === "high" ? "warning" : "secondary";
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-card animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">{r.topic}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{r.reasoning}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold text-falcon-gold-deep">{r.probability}%</p>
                  <Badge variant={color as any} className="capitalize">{r.priority}</Badge>
                </div>
              </div>
              <Progress value={r.probability} className="mt-3" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
