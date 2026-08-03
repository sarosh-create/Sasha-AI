import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, Save, BookOpen, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Sasha AI" },
      { name: "description", content: "Change your exam board, subjects, daily goal, and preferences." },
      { property: "og:title", content: "Settings — Sasha AI" },
      { property: "og:description", content: "Change your exam board, subjects, daily goal, and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/settings" }],
  }),
});

const BOARDS = ["Cambridge IGCSE", "Cambridge O Level", "Cambridge A Level", "Edexcel IGCSE", "Edexcel A Level", "AQA GCSE", "AQA A Level", "OCR GCSE", "OCR A Level", "IB DP", "IB MYP", "SAT", "AP", "JEE", "NEET", "Other"];
const VIDEO_STYLES = [
  { id: "cartoon", label: "🎬 Cartoon explainer" },
  { id: "whiteboard", label: "📝 Whiteboard walkthrough" },
  { id: "talkinghead", label: "🎤 Talking-head teacher" },
  { id: "meme", label: "🤣 Meme-style fast recap" },
  { id: "lab", label: "🧪 Lab demonstration" },
];

type Subject = { id: string; name: string; strength_score: number; color: string };

function SettingsPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState("");
  const [examDate, setExamDate] = useState("");
  const [dailyGoal, setDailyGoal] = useState(45);
  const [optIn, setOptIn] = useState(true);
  const [dailyEmail, setDailyEmail] = useState(true);
  const [weeklyEmail, setWeeklyEmail] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [videoStyle, setVideoStyle] = useState<string>(() => (typeof window !== "undefined" ? localStorage.getItem("sasha:videoStyle") ?? "cartoon" : "cartoon"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: subs }] = await Promise.all([
        supabase.from("profiles").select("exam_board, exam_date, daily_minutes_goal, leaderboard_opt_in, email_daily_reminders, email_weekly_digest").eq("user_id", user.id).maybeSingle(),
        supabase.from("subjects").select("id, name, strength_score, color").eq("user_id", user.id).order("name"),
      ]);
      if (p) {
        setBoard(p.exam_board ?? "");
        setExamDate(p.exam_date ?? "");
        setDailyGoal(p.daily_minutes_goal ?? 45);
        setOptIn(p.leaderboard_opt_in ?? true);
        setDailyEmail(p.email_daily_reminders ?? true);
        setWeeklyEmail(p.email_weekly_digest ?? true);
      }
      setSubjects(subs ?? []);
    })();
  }, [user]);

  const savePrefs = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ exam_board: board || null, exam_date: examDate || null, daily_minutes_goal: dailyGoal, leaderboard_opt_in: optIn, email_daily_reminders: dailyEmail, email_weekly_digest: weeklyEmail })
      .eq("user_id", user.id);
    localStorage.setItem("sasha:videoStyle", videoStyle);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  const addSubject = async () => {
    if (!user || !newSubject.trim()) return;
    const colors = ["#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#60a5fa", "#fb7185"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const { data, error } = await supabase.from("subjects").insert({ user_id: user.id, name: newSubject.trim(), color, strength_score: 50 } as any).select().single();
    if (error) return toast.error(error.message);
    setSubjects((s) => [...s, data as Subject]);
    setNewSubject("");
  };

  const removeSubject = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSubjects((s) => s.filter((x) => x.id !== id));
  };

  return (
    <div className="container mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5" />
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
      </div>
      <p className="text-sm text-muted-foreground">Change your exam board, subjects, and how Sasha teaches you — anytime.</p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Exam board & date</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Exam board</Label>
            <Select value={board} onValueChange={setBoard}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pick a board" /></SelectTrigger>
              <SelectContent>{BOARDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="exam-date">Exam date</Label>
            <Input id="exam-date" type="date" className="mt-1" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Subjects</h2>
        <p className="text-xs text-muted-foreground">Add or remove anytime — your study path adapts automatically.</p>
        <ul className="mt-4 space-y-2">
          {subjects.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
              <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
              <span className="flex-1 font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.strength_score}/100</span>
              <Button size="sm" variant="ghost" onClick={() => removeSubject(s.id)} aria-label={`Remove ${s.name}`}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
          {subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects yet.</p>}
        </ul>
        <div className="mt-3 flex gap-2">
          <Input placeholder="Add a subject e.g. Biology" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubject()} />
          <Button onClick={addSubject}><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Daily target & video style</h2>
        <div className="mt-4 space-y-5">
          <div>
            <Label>Daily minutes goal: <span className="font-display text-base">{dailyGoal}</span> min</Label>
            <Slider value={[dailyGoal]} min={10} max={180} step={5} onValueChange={(v) => setDailyGoal(v[0])} className="mt-2" />
          </div>
          <div>
            <Label>Preferred video style for lessons</Label>
            <Select value={videoStyle} onValueChange={setVideoStyle}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{VIDEO_STYLES.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
            <div>
              <p className="text-sm font-medium">Show me on the global leaderboard</p>
              <p className="text-xs text-muted-foreground">Compete with every Sasha learner worldwide.</p>
            </div>
            <Switch checked={optIn} onCheckedChange={setOptIn} />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Email reminders</h2>
        <p className="text-xs text-muted-foreground">We only email you about your own studying — never marketing.</p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Daily study nudge</p>
              <p className="text-xs text-muted-foreground">What to study next, plus your exam countdown.</p>
            </div>
            <Switch checked={dailyEmail} onCheckedChange={setDailyEmail} aria-label="Daily study nudge" />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Weekly progress summary</p>
              <p className="text-xs text-muted-foreground">Mastery gains, quiz scores and next week's focus areas.</p>
            </div>
            <Switch checked={weeklyEmail} onCheckedChange={setWeeklyEmail} aria-label="Weekly progress summary" />
          </div>
        </div>
      </section>


      <div className="mt-6 flex items-center justify-between">
        <Link to="/onboarding"><Button variant="outline"><BookOpen className="h-4 w-4" /> Full setup wizard</Button></Link>
        <Button onClick={savePrefs} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}
