import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, ExternalLink, CalendarClock } from "lucide-react";
import { PageLoading, ErrorState, EmptyState } from "@/components/ui/states";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({ meta: [
    { title: "Live classes — Sasha AI" },
    { name: "description", content: "Sign up for live classes with Sasha AI teachers — small-group sessions across maths, sciences and exam-board specific topics." },
    { property: "og:title", content: "Live classes — Sasha AI" },
    { property: "og:description", content: "Join small-group live classes with Sasha AI teachers, across maths, sciences and exam-board topics." },
    { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/classes" },
  ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/classes" }] }),
  component: ClassesPage,
});

function ClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [signups, setSignups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc("list_live_classes");
      if (err) throw err;
      setClasses((data ?? []).map((c: any) => ({ ...c, teachers: { name: c.teacher_name, subject: c.teacher_subject } })));

      if (user) {
        const { data: su } = await supabase.from("class_signups").select("class_id").eq("user_id", user.id);
        setSignups(new Set((su ?? []).map((r: any) => r.class_id)));
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load classes");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const toggle = async (classId: string) => {
    if (!user) return;
    if (signups.has(classId)) {
      const { error } = await supabase.from("class_signups").delete().eq("class_id", classId).eq("user_id", user.id);
      if (error) return toast.error(error.message);
      toast.success("Signed off");
    } else {
      const { error } = await supabase.from("class_signups").insert({ class_id: classId, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("You're in!");
    }
    load();
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="font-display text-3xl font-semibold">Live classes</h1>
      <p className="mb-6 text-sm text-muted-foreground">Scheduled lessons with real teachers. Sign up to reserve your spot.</p>
      {loading ? (
        <PageLoading className="p-0" label="Loading classes…" />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : classes.length === 0 ? (
        <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="No classes scheduled yet" description="Live classes with real teachers will appear here once scheduled." />
      ) : (
      <div className="space-y-3">
        {classes.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h2 className="font-display text-lg font-semibold">{c.title}</h2>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(c.scheduled_at).toLocaleString()} · {c.duration_minutes}min
                  {c.teachers?.name && <> · {c.teachers.name}</>}
                  {c.subject && <> · {c.subject}</>}
                </p>
                {c.description && <p className="mt-2 text-sm">{c.description}</p>}
                {c.meeting_url && (
                  <a href={c.meeting_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    Join meeting <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <Button size="sm" variant={signups.has(c.id) ? "secondary" : "default"} onClick={() => toggle(c.id)}>
                {signups.has(c.id) ? "Signed up ✓" : "Sign up"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
