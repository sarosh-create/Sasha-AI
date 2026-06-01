import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Beaker, Atom, Leaf, Trophy, RotateCcw, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { addXp } from "@/lib/gamification";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lab")({
  component: LabPage,
});

type Step = {
  id: string;
  emoji: string;
  label: string;
  hint: string;
};

type Experiment = {
  id: string;
  subject: "physics" | "chemistry" | "biology";
  name: string;
  goal: string;
  bench: string; // big emoji scene
  steps: Step[];      // correct order
  distractors: Step[];
  reading: { prompt: string; correct: string; options: string[] };
  xp: number;
};

const EXPERIMENTS: Experiment[] = [
  {
    id: "pendulum",
    subject: "physics",
    name: "Find g with a pendulum",
    goal: "Measure gravitational acceleration using a swinging pendulum.",
    bench: "🧪",
    xp: 60,
    steps: [
      { id: "clamp", emoji: "🗜️", label: "Clamp the stand", hint: "Stable mount." },
      { id: "string", emoji: "🧵", label: "Tie 1.0 m string", hint: "Measured length." },
      { id: "bob", emoji: "⚪", label: "Attach the bob", hint: "The mass." },
      { id: "swing", emoji: "🔁", label: "Swing < 10°", hint: "Small-angle approx." },
      { id: "time", emoji: "⏱️", label: "Time 20 swings", hint: "Reduce reaction error." },
    ],
    distractors: [
      { id: "heat", emoji: "🔥", label: "Heat the bob", hint: "Why would you." },
      { id: "stir", emoji: "🥄", label: "Stir vigorously", hint: "Wrong lab." },
    ],
    reading: {
      prompt: "20 swings took 40.0 s with L = 1.00 m. What is g?",
      correct: "9.87 m/s²",
      options: ["4.93 m/s²", "9.87 m/s²", "19.7 m/s²", "0.99 m/s²"],
    },
  },
  {
    id: "titration",
    subject: "chemistry",
    name: "Acid–Base Titration",
    goal: "Find unknown HCl concentration with NaOH.",
    bench: "⚗️",
    xp: 70,
    steps: [
      { id: "pipette", emoji: "💉", label: "Pipette 25 mL HCl", hint: "Accurate volume." },
      { id: "indicator", emoji: "🌸", label: "Add phenolphthalein", hint: "End-point colour." },
      { id: "burette", emoji: "🧫", label: "Fill burette w/ NaOH", hint: "Titrant." },
      { id: "titrate", emoji: "💧", label: "Titrate dropwise", hint: "Until pink stays." },
      { id: "record", emoji: "📓", label: "Record end volume", hint: "For calculation." },
    ],
    distractors: [
      { id: "shake", emoji: "🥤", label: "Shake the flask shut", hint: "Splash hazard." },
      { id: "boil", emoji: "♨️", label: "Boil the HCl", hint: "Not in this expt." },
    ],
    reading: {
      prompt: "25.0 mL HCl needed 22.5 mL of 0.10 M NaOH. [HCl] = ?",
      correct: "0.090 M",
      options: ["0.090 M", "0.11 M", "0.225 M", "0.0090 M"],
    },
  },
  {
    id: "osmosis",
    subject: "biology",
    name: "Osmosis in potato cells",
    goal: "Show water moves from low → high solute concentration.",
    bench: "🥔",
    xp: 60,
    steps: [
      { id: "cut", emoji: "🔪", label: "Cut equal potato cubes", hint: "Fair test." },
      { id: "mass", emoji: "⚖️", label: "Weigh & record mass", hint: "Baseline." },
      { id: "salt", emoji: "🧂", label: "Prep salt solutions", hint: "Range of conc." },
      { id: "soak", emoji: "🥣", label: "Soak 30 min", hint: "Allow osmosis." },
      { id: "remass", emoji: "📊", label: "Dry & re-weigh", hint: "% change in mass." },
    ],
    distractors: [
      { id: "fry", emoji: "🍟", label: "Fry the potato", hint: "Wrong subject." },
      { id: "freeze", emoji: "🧊", label: "Freeze overnight", hint: "Kills cells." },
    ],
    reading: {
      prompt: "Cube in 1.0 M salt SHRANK. What happened?",
      correct: "Water left cells (hypertonic)",
      options: [
        "Water entered cells (hypotonic)",
        "Water left cells (hypertonic)",
        "Nothing — isotonic",
        "Cells divided",
      ],
    },
  },
];

const SUBJECT_META = {
  physics:   { color: "#4D96FF", icon: Atom,   label: "Physics" },
  chemistry: { color: "#FF6B6B", icon: Beaker, label: "Chemistry" },
  biology:   { color: "#6BCB77", icon: Leaf,   label: "Biology" },
} as const;

function LabPage() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => EXPERIMENTS.find((e) => e.id === activeId) ?? null, [activeId]);

  if (!active) {
    return (
      <div className="bg-aurora min-h-[calc(100vh-3rem)] p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent">
              <Beaker className="h-3.5 w-3.5" /> Virtual Lab
            </div>
            <h1 className="font-display text-4xl font-bold text-gradient">Practical Paper — Game Mode</h1>
            <p className="mt-2 text-sm text-muted-foreground">Pick an experiment. Set up the apparatus. Take a reading. Earn XP.</p>
          </header>
          <div className="grid gap-4 md:grid-cols-3">
            {EXPERIMENTS.map((e) => {
              const meta = SUBJECT_META[e.subject];
              const Icon = meta.icon;
              return (
                <Card
                  key={e.id}
                  onClick={() => setActiveId(e.id)}
                  className="group relative cursor-pointer overflow-hidden border-2 p-5 shadow-pop transition hover:-translate-y-1"
                  style={{ borderColor: meta.color }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: meta.color }}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </div>
                    <span className="text-xs font-bold text-warning-foreground">+{e.xp} XP</span>
                  </div>
                  <div className="animate-bob text-6xl">{e.bench}</div>
                  <h3 className="mt-3 font-display text-xl font-bold">{e.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{e.goal}</p>
                  <Button className="mt-4 w-full" style={{ background: meta.color, color: "white" }}>
                    Enter lab →
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ExperimentRunner
      experiment={active}
      onExit={() => setActiveId(null)}
      onComplete={async (xp) => {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
        if (user) {
          await addXp(user.id, xp);
          await supabase.from("study_logs").insert({
            user_id: user.id, activity: `lab:${active.id}`, minutes: 10,
          });
        }
        toast.success(`Experiment complete! +${xp} XP`);
      }}
    />
  );
}

function ExperimentRunner({
  experiment, onExit, onComplete,
}: { experiment: Experiment; onExit: () => void; onComplete: (xp: number) => void }) {
  const meta = SUBJECT_META[experiment.subject];
  const [placed, setPlaced] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [phase, setPhase] = useState<"setup" | "reading" | "done">("setup");
  const [answer, setAnswer] = useState<string | null>(null);

  const pool = useMemo(() => {
    const all = [...experiment.steps, ...experiment.distractors];
    return all.sort(() => Math.random() - 0.5);
  }, [experiment.id]);

  const click = (id: string) => {
    if (placed.includes(id)) return;
    const expectedIdx = placed.length;
    const expected = experiment.steps[expectedIdx];
    if (expected && expected.id === id) {
      const next = [...placed, id];
      setPlaced(next);
      if (next.length === experiment.steps.length) {
        setTimeout(() => setPhase("reading"), 400);
      }
    } else {
      setMistakes((m) => m + 1);
      toast.error("Not the right step yet — check the procedure!");
    }
  };

  const reset = () => { setPlaced([]); setMistakes(0); setPhase("setup"); setAnswer(null); };

  const submitReading = (opt: string) => {
    setAnswer(opt);
    const correct = opt === experiment.reading.correct;
    const xp = Math.max(20, experiment.xp - mistakes * 10) + (correct ? 20 : 0);
    setTimeout(() => {
      setPhase("done");
      onComplete(xp);
    }, 600);
  };

  return (
    <div className="bg-aurora min-h-[calc(100vh-3rem)] p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onExit}>← Back to lab</Button>
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: meta.color }}>
            {meta.label} • {experiment.name}
          </div>
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset</Button>
        </div>

        <Card className="overflow-hidden p-0 shadow-pop">
          <div
            className="relative flex h-56 items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${meta.color}33, transparent)` }}
          >
            <div className="text-8xl animate-bob">{experiment.bench}</div>
            <div className="absolute top-3 left-3 rounded-full bg-background/80 px-2 py-0.5 text-xs font-semibold backdrop-blur">
              Mistakes: {mistakes}
            </div>
            <div className="absolute top-3 right-3 rounded-full bg-background/80 px-2 py-0.5 text-xs font-semibold backdrop-blur">
              Step {Math.min(placed.length + 1, experiment.steps.length)} / {experiment.steps.length}
            </div>
          </div>

          <div className="space-y-4 p-5">
            <p className="text-sm text-muted-foreground">{experiment.goal}</p>

            {phase === "setup" && (
              <>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Procedure timeline</div>
                  <div className="flex flex-wrap gap-2">
                    {experiment.steps.map((s, i) => {
                      const done = placed.includes(s.id);
                      const next = i === placed.length;
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm transition ${
                            done
                              ? "border-success bg-success/20 text-success-foreground"
                              : next
                              ? "border-primary bg-primary/10 animate-wiggle"
                              : "border-dashed border-border bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className="text-lg">{done ? "✅" : s.emoji}</span>
                          {done ? s.label : `Step ${i + 1}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tap the apparatus / action you need next
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {pool.map((s) => {
                      const done = placed.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          disabled={done}
                          onClick={() => click(s.id)}
                          className={`group flex items-start gap-3 rounded-2xl border-2 bg-card p-3 text-left shadow-pop transition ${
                            done ? "opacity-30" : "hover:-translate-y-0.5 hover:border-primary"
                          }`}
                        >
                          <span className="text-3xl">{s.emoji}</span>
                          <div className="flex-1">
                            <div className="font-display text-sm font-bold">{s.label}</div>
                            <div className="text-xs text-muted-foreground">{s.hint}</div>
                          </div>
                          {done && <Check className="h-4 w-4 text-success" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {phase === "reading" && (
              <div className="space-y-3 rounded-2xl border-2 border-warning bg-warning/10 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-warning-foreground">📓 Take your reading</div>
                <div className="font-display text-lg font-semibold">{experiment.reading.prompt}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {experiment.reading.options.map((o) => {
                    const picked = answer === o;
                    const correct = o === experiment.reading.correct;
                    return (
                      <button
                        key={o}
                        disabled={!!answer}
                        onClick={() => submitReading(o)}
                        className={`rounded-xl border-2 bg-card p-3 text-left font-medium transition hover:-translate-y-0.5 ${
                          picked
                            ? correct ? "border-success bg-success/20" : "border-destructive bg-destructive/10"
                            : "border-border"
                        }`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {phase === "done" && (
              <div className="rounded-2xl border-2 border-success bg-success/10 p-6 text-center">
                <Trophy className="mx-auto h-10 w-10 text-success" />
                <div className="mt-2 font-display text-2xl font-bold">Experiment complete!</div>
                <div className="text-sm text-muted-foreground">You ran a clean lab. Take a screenshot for your portfolio.</div>
                <div className="mt-4 flex justify-center gap-2">
                  <Button onClick={reset} variant="outline"><RotateCcw className="h-4 w-4" /> Run again</Button>
                  <Button onClick={onExit}>Back to lab</Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
