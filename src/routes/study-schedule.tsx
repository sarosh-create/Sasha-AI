import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/logo";
import { CalendarDays, Clock, Target, Sparkles } from "lucide-react";
import { saveSchedule } from "@/lib/study-schedule-store";
import { toast } from "sonner";

export const Route = createFileRoute("/study-schedule")({
  head: () => ({
    meta: [
      { title: "Study Schedule Generator — daily exam revision plan | Sasha AI" },
      {
        name: "description",
        content:
          "Free study schedule generator. Enter your exam date, board and subjects to get a day-by-day revision timetable with topics, practice and rest days.",
      },
      { name: "keywords", content: "study schedule generator, revision timetable, exam study plan, daily study planner" },
      { property: "og:title", content: "Study Schedule Generator — daily exam revision plan" },
      { property: "og:description", content: "Enter your exam date and board and get a day-by-day revision timetable, free." },
      { property: "og:url", content: "https://sashaai.lovable.app/study-schedule" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Study Schedule Generator — daily exam revision plan" },
      { name: "twitter:description", content: "Enter your exam date and board and get a day-by-day revision timetable, free." },
    ],
    links: [{ rel: "canonical", href: "https://sashaai.lovable.app/study-schedule" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Sasha AI Study Schedule Generator",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description:
            "Free study schedule generator that turns an exam date, exam board and subject list into a daily revision timetable.",
        }),
      },
    ],
  }),
  component: StudySchedulePage,
});

const BOARDS = [
  "Cambridge IGCSE",
  "Cambridge A-Level",
  "Edexcel IGCSE",
  "Edexcel A-Level",
  "AQA GCSE",
  "AQA A-Level",
  "OCR",
  "IB Diploma",
  "CBSE",
  "Other / school exam",
];

type Day = {
  date: Date;
  label: string;
  subject: string;
  focus: string;
  blocks: { minutes: number; what: string }[];
  rest: boolean;
};

const FOCUS_CYCLE = [
  "Learn the core content",
  "Active recall + flashcards",
  "Past-paper questions",
  "Fix your weak spots",
  "Timed mini-exam",
];

function buildPlan(examDate: string, board: string, subjectsRaw: string, minutes: number): Day[] {
  const subjects = subjectsRaw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!examDate || subjects.length === 0) return [];

  const end = new Date(examDate + "T00:00:00");
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days: Day[] = [];
  let i = 0;

  for (let d = new Date(start); d <= end && days.length < 120; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    const daysLeft = Math.round((end.getTime() - date.getTime()) / 86400000);
    const isRest = date.getDay() === 0 && daysLeft > 7;
    const subject = subjects[i % subjects.length];
    const focus = daysLeft <= 3 ? "Final recap — no new content" : FOCUS_CYCLE[i % FOCUS_CYCLE.length];

    const blocks = isRest
      ? [{ minutes: 20, what: "Light flashcard review, then rest properly" }]
      : [
          { minutes: Math.round(minutes * 0.45), what: `${subject}: ${focus.toLowerCase()} (${board} syllabus scope)` },
          { minutes: Math.round(minutes * 0.35), what: `${subject}: ${board}-style exam questions under time` },
          { minutes: Math.round(minutes * 0.2), what: "Mark strictly, log every lost mark, redo one question" },
        ];

    days.push({
      date,
      label: date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
      subject: isRest ? "Rest day" : subject,
      focus: isRest ? "Recovery keeps memory strong" : focus,
      blocks,
      rest: isRest,
    });
    if (!isRest) i++;
  }
  return days;
}

function StudySchedulePage() {
  const [examDate, setExamDate] = useState("");
  const [board, setBoard] = useState(BOARDS[0]);
  const [subjects, setSubjects] = useState("Biology, Chemistry, Mathematics");
  const [minutes, setMinutes] = useState(90);
  const [submitted, setSubmitted] = useState(false);

  const plan = useMemo(
    () => (submitted ? buildPlan(examDate, board, subjects, minutes) : []),
    [submitted, examDate, board, subjects, minutes],
  );

  const daysLeft = examDate
    ? Math.max(0, Math.round((new Date(examDate + "T00:00:00").getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="bg-aurora min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <Link to="/" aria-label="Sasha AI home">
          <Logo />
        </Link>
        <Button asChild size="sm">
          <Link to="/auth">Sign up free</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 pb-16">
        <section className="text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <CalendarDays className="h-3.5 w-3.5" /> Study schedule generator
          </div>
          <h1 className="font-display text-4xl font-bold text-gradient">Your exam, planned day by day</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Tell Sasha your exam date, exam board and subjects. You'll get a daily revision timetable with what to
            study, how long for, and when to rest — built around how your board actually examines you.
          </p>
        </section>

        <section aria-labelledby="plan-inputs" className="rounded-2xl border bg-card p-6 shadow-pop">
          <h2 id="plan-inputs" className="mb-4 font-display text-xl font-bold">
            1. Your exam details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exam-date">Exam date</Label>
              <Input id="exam-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-board">Exam board</Label>
              <select
                id="exam-board"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {BOARDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="subjects">Subjects (comma separated)</Label>
              <Textarea
                id="subjects"
                rows={2}
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder="Biology, Chemistry, Mathematics"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minutes">Minutes you can study per day</Label>
              <Input
                id="minutes"
                type="number"
                min={20}
                max={480}
                step={10}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(20, Math.min(480, Number(e.target.value) || 60)))}
              />
            </div>
          </div>
          <Button
            className="mt-5"
            onClick={() => {
              setSubmitted(true);
              const built = buildPlan(examDate, board, subjects, minutes);
              if (built.length) {
                saveSchedule({
                  board,
                  examDate,
                  minutes,
                  savedAt: new Date().toISOString(),
                  days: built.map((d) => ({
                    iso: d.date.toISOString(),
                    label: d.label,
                    subject: d.subject,
                    focus: d.focus,
                    rest: d.rest,
                    blocks: d.blocks,
                  })),
                });
                toast.success("Plan saved — it now shows on your study path too.");
              }
            }}
            disabled={!examDate || !subjects.trim()}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Generate my daily plan
          </Button>
        </section>

        {submitted && plan.length > 0 && (
          <section aria-labelledby="plan-output" className="space-y-3">
            <h2 id="plan-output" className="font-display text-xl font-bold">
              2. Your daily plan
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-card p-4 shadow-pop">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Target className="h-3.5 w-3.5" /> Days until exam
                </div>
                <div className="font-display text-2xl font-bold">{daysLeft}</div>
              </div>
              <div className="rounded-2xl border bg-card p-4 shadow-pop">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Daily study time
                </div>
                <div className="font-display text-2xl font-bold">{minutes} min</div>
              </div>
              <div className="rounded-2xl border bg-card p-4 shadow-pop">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> Board
                </div>
                <div className="font-display text-lg font-bold">{board}</div>
              </div>
            </div>

            <ol className="space-y-2">
              {plan.map((day) => (
                <li
                  key={day.date.toISOString()}
                  className={`rounded-2xl border bg-card p-4 shadow-pop ${day.rest ? "opacity-80" : ""}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{day.label}</span>
                    <span className="text-sm text-primary">{day.subject}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{day.focus}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {day.blocks.map((b, bi) => (
                      <li key={bi} className="flex gap-2">
                        <span className="shrink-0 rounded-md bg-secondary px-2 text-xs leading-6">{b.minutes}m</span>
                        <span>{b.what}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="plan-next" className="rounded-2xl border bg-card p-6 text-center shadow-pop">
          <h2 id="plan-next" className="font-display text-xl font-bold">
            Want Sasha to run the plan with you?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign up free to save this schedule, get daily reminders, mark your past papers and track every topic you
            master.
          </p>
          <Button asChild className="mt-4">
            <Link to="/auth">Create a free account</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
