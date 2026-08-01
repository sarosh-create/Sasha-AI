import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { generatePathFor } from "@/routes/_authenticated.path";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [
    { title: "Set up your study plan — Sasha AI" },
    { name: "description", content: "Pick your exam board, subjects and target date — Sasha AI builds your personalised study roadmap in seconds." },
    { property: "og:title", content: "Set up your study plan — Sasha AI" },
    { property: "og:description", content: "Tell Sasha AI your exam board and subjects to generate a personalised study roadmap." },
    { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/onboarding" },
  ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/onboarding" }] }),
  component: Onboarding,
});

type Subject = { name: string; strength_score: number };

const BOARDS = [
  "Matric (FBISE)",
  "Matric (Punjab Board)",
  "Matric (Sindh Board)",
  "Matric (KPK Board)",
  "Matric (Balochistan Board)",
  "AQA",
  "Edexcel GCSE",
  "Pearson Edexcel International GCSE",
  "Pearson Edexcel A Level",
  "OCR",
  "WJEC/Eduqas",
  "Cambridge O Level",
  "Cambridge IGCSE",
  "Cambridge AS & A Level",
  "A Levels AMTIC",
  "FSc / Intermediate",
  "IB",
  "SAT",
  "ACT",
  "CBSE",
  "ICSE",
  "Other",
];
const LEVELS = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Matric / Class 10", "O Level", "IGCSE", "AS Level", "A Level", "FSc / Intermediate", "University"];

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"student" | "teacher">("student");
  const [board, setBoard] = useState("AQA");
  const [gradeLevel, setGradeLevel] = useState("Class 10");
  const [examDate, setExamDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const [subjects, setSubjects] = useState<Subject[]>([
    { name: "Maths", strength_score: 60 },
    { name: "Biology", strength_score: 40 },
  ]);
  const [newSubj, setNewSubj] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, account_type, exam_board, grade_level, exam_date, daily_minutes_goal")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setName(data.display_name ?? "");
        setAccountType((data.account_type as "student" | "teacher") ?? "student");
        setBoard(data.exam_board ?? "AQA");
        setGradeLevel(data.grade_level ?? "Class 10");
        setExamDate(data.exam_date ?? "");
        setDailyMinutes(data.daily_minutes_goal ?? 45);
      }
      const { data: subs } = await supabase
        .from("subjects")
        .select("name, strength_score")
        .eq("user_id", user.id);
      if (subs && subs.length) setSubjects(subs);
    })();
  }, [user]);

  const addSubject = () => {
    if (!newSubj.trim()) return;
    setSubjects([...subjects, { name: newSubj.trim(), strength_score: 50 }]);
    setNewSubj("");
  };

  const save = async () => {
    if (!user) return;
    if (!subjects.length) {
      toast.error("Add at least one subject");
      return;
    }
    setBusy(true);
    try {
      const { error: pErr } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          display_name: name || null,
          account_type: accountType,
          exam_board: board,
          grade_level: gradeLevel,
          exam_date: examDate || null,
          daily_minutes_goal: dailyMinutes,
          onboarded: true,
        },
        { onConflict: "user_id" },
      );
      if (pErr) throw pErr;

      // replace subjects
      await supabase.from("subjects").delete().eq("user_id", user.id);
      const { error: sErr } = await supabase.from("subjects").insert(
        subjects.map((s) => ({
          user_id: user.id,
          name: s.name,
          strength_score: s.strength_score,
          priority: 100 - s.strength_score,
        })),
      );
      if (sErr) throw sErr;

      // Auto-generate study path now that subjects exist
      await supabase.from("lesson_path").delete().eq("user_id", user.id);
      await generatePathFor(user.id);

      toast.success("Study plan ready!");
      nav({ to: "/path" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold">Let's set up your study plan</h1>
      <p className="mt-2 text-muted-foreground">
        Tell Sasha AI your board, class, and subjects — it will build lessons around your weak spots.
      </p>

      <div className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Account type</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as "student" | "teacher")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Exam board</Label>
            <Select value={board} onValueChange={setBoard}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BOARDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Class / level</Label>
            <Select value={gradeLevel} onValueChange={setGradeLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="exam">Next exam date</Label>
            <Input id="exam" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div>
            <Label>Daily study goal: <span className="font-medium">{dailyMinutes} min</span></Label>
            <Slider
              value={[dailyMinutes]}
              onValueChange={(v) => setDailyMinutes(v[0])}
              min={15} max={180} step={5}
              className="mt-3"
            />
          </div>
        </div>

        <div>
          <Label>Subjects & current confidence</Label>
          <p className="mb-3 text-xs text-muted-foreground">
            Slide low for weak subjects — your plan will spend more time there.
          </p>
          <div className="space-y-3">
            {subjects.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Input
                    value={s.name}
                    onChange={(e) => {
                      const copy = [...subjects];
                      copy[i].name = e.target.value;
                      setSubjects(copy);
                    }}
                    className="max-w-xs"
                  />
                  <div className="flex items-center gap-3">
                    <Badge variant={s.strength_score < 50 ? "destructive" : "secondary"}>
                      {s.strength_score < 40 ? "Weak" : s.strength_score < 70 ? "Okay" : "Strong"}
                    </Badge>
                    <button onClick={() => setSubjects(subjects.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <Slider
                  value={[s.strength_score]}
                  onValueChange={(v) => {
                    const copy = [...subjects];
                    copy[i].strength_score = v[0];
                    setSubjects(copy);
                  }}
                  min={0} max={100} step={5}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Add a subject (e.g. Chemistry)"
              value={newSubj}
              onChange={(e) => setNewSubj(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())}
            />
            <Button type="button" variant="outline" onClick={addSubject}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={save} disabled={busy} size="lg">
            {busy ? "Saving…" : "Save & build my plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
