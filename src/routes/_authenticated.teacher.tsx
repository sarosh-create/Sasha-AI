import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRoles } from "@/lib/use-role";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Users } from "lucide-react";
import { PageLoading, CardSkeletons, EmptyState, ErrorState } from "@/components/ui/states";

export const Route = createFileRoute("/_authenticated/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — Sasha AI" },
      { name: "description", content: "Monitor student progress, quiz results and study paths from one teacher dashboard." },
      { property: "og:title", content: "Teacher Dashboard — Sasha AI" },
      { property: "og:description", content: "Monitor student progress, quiz results and study paths from one teacher dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/teacher" }],
  }),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const { user } = useAuth();
  const { isTeacher, isStaff, loading } = useRoles();
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [details, setDetails] = useState<{ subjects: any[]; quizzes: any[]; path: any[] } | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const loadStudents = async () => {
    if (!user) return;
    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const { data: links, error: err1 } = await supabase.from("teacher_students").select("student_user_id").eq("teacher_user_id", user.id);
      if (err1) throw err1;
      const ids = (links ?? []).map((l: any) => l.student_user_id);
      if (!ids.length) { setStudents([]); return; }
      const { data: profs, error: err2 } = await supabase.from("profiles").select("user_id, display_name, grade_level, exam_board, account_type").in("user_id", ids);
      if (err2) throw err2;
      setStudents(profs ?? []);
    } catch (e: any) {
      setStudentsError(e.message ?? "Failed to load students");
    } finally {
      setStudentsLoading(false);
    }
  };
  useEffect(() => { loadStudents(); }, [user]);

  useEffect(() => { (async () => {
    if (!selected) { setDetails(null); return; }
    const [{ data: subjects }, { data: quizzes }, { data: path }] = await Promise.all([
      supabase.from("subjects").select("*").eq("user_id", selected.user_id),
      supabase.from("quizzes").select("*").eq("user_id", selected.user_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("lesson_path").select("*").eq("user_id", selected.user_id).order("position"),
    ]);
    setDetails({ subjects: subjects ?? [], quizzes: quizzes ?? [], path: path ?? [] });
  })(); }, [selected]);

  if (loading) return <PageLoading label="Loading teacher dashboard…" />;
  if (!isTeacher && !isStaff) return <Navigate to="/dashboard" />;

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <h1 className="font-display text-3xl font-semibold">Teacher dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your linked students and their progress.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Students ({students.length})</p>
          {studentsLoading ? (
            <CardSkeletons count={3} className="sm:grid-cols-1 lg:grid-cols-1" />
          ) : studentsError ? (
            <ErrorState description={studentsError} onRetry={loadStudents} />
          ) : students.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No students assigned"
              description="Ask an admin to link students to your account."
            />
          ) : students.map((s) => (
            <Card key={s.user_id} className={`cursor-pointer p-3 ${selected?.user_id === s.user_id ? "border-primary" : ""}`} onClick={() => setSelected(s)}>
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-muted"><User className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-medium">{s.display_name || "Student"}</p>
                  <p className="text-xs text-muted-foreground">{[s.grade_level, s.exam_board].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div>
          {!selected ? (
            <Card className="grid h-40 place-items-center text-muted-foreground">Select a student to view their progress.</Card>
          ) : !details ? (
            <Card className="grid h-40 place-items-center"><CardSkeletons count={1} className="w-full px-4 sm:grid-cols-1 lg:grid-cols-1" /></Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <p className="font-display text-xl font-semibold">{selected.display_name}</p>
                <p className="text-sm text-muted-foreground">{[selected.grade_level, selected.exam_board, selected.account_type].filter(Boolean).join(" · ")}</p>
              </Card>
              <Card className="p-4">
                <p className="mb-2 font-semibold">Subjects</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {details.subjects.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <span>{s.name}</span>
                      <span className="text-muted-foreground">mastery {s.strength_score}/100</span>
                    </div>
                  ))}
                  {!details.subjects.length && <p className="text-sm text-muted-foreground">No subjects yet.</p>}
                </div>
              </Card>
              <Card className="p-4">
                <p className="mb-2 font-semibold">Recent quizzes</p>
                <div className="space-y-1">
                  {details.quizzes.map((q: any) => (
                    <div key={q.id} className="flex items-center justify-between text-sm">
                      <span>{q.subject ?? "Quiz"}</span>
                      <span className="text-muted-foreground">{q.score ?? "—"}/{q.total ?? "—"}</span>
                    </div>
                  ))}
                  {!details.quizzes.length && <p className="text-sm text-muted-foreground">No quizzes yet.</p>}
                </div>
              </Card>
              <Card className="p-4">
                <p className="mb-2 font-semibold">Study path</p>
                <div className="space-y-1 text-sm">
                  {details.path.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between">
                      <span>{l.title}</span>
                      <span className={`text-xs ${l.status === "done" ? "text-green-600" : "text-muted-foreground"}`}>{l.status}</span>
                    </div>
                  ))}
                  {!details.path.length && <p className="text-sm text-muted-foreground">No path yet.</p>}
                </div>
              </Card>
              <Button asChild variant="outline"><a href={`mailto:?subject=Sasha AI`}>Email student</a></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
