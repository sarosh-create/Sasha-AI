import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Beaker, Atom, Leaf, Trophy, RotateCcw, Check, Lock, Lightbulb, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { addXp, checkLabBadges, bumpChallenge, fireConfetti } from "@/lib/gamification";
import { fireEmojiBurst } from "@/components/emoji-burst";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lab")({
  head: () => ({ meta: [
    { title: "Practical Lab — Sasha AI" },
    { name: "description", content: "Practice practical-paper experiments in physics, chemistry and biology with Sasha AI's interactive lab game mode." },
    { property: "og:title", content: "Practical Lab — Sasha AI" },
    { property: "og:description", content: "Interactive practical-paper lab for physics, chemistry and biology — game-mode experiments inside Sasha AI." },
    { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/lab" },
  ] }),
  component: LabPage,
});

type Step = { id: string; emoji: string; label: string; hint: string };

type Experiment = {
  id: string;
  subject: "physics" | "chemistry" | "biology";
  name: string;
  goal: string;
  bench: string;
  steps: Step[];
  distractors: Step[];
  reading: { prompt: string; correct: string; options: string[] };
  xp: number;
  requiredLevel: number;
  requiredQuizzes: number; // quizzes ≥70% the student has done
};

const EXPERIMENTS: Experiment[] = [
  // ---- PHYSICS ----
  {
    id: "physics_pendulum", subject: "physics", name: "Find g with a pendulum",
    goal: "Measure gravitational acceleration using a swinging pendulum.",
    bench: "🧪", xp: 60, requiredLevel: 1, requiredQuizzes: 0,
    steps: [
      { id: "clamp", emoji: "🗜️", label: "Clamp the stand", hint: "Need a stable mount above the bench." },
      { id: "string", emoji: "🧵", label: "Tie 1.0 m string", hint: "Measure the length precisely with a ruler." },
      { id: "bob", emoji: "⚪", label: "Attach the bob", hint: "The mass on the end — keep it small." },
      { id: "swing", emoji: "🔁", label: "Swing < 10°", hint: "Small angle so T = 2π√(L/g) is valid." },
      { id: "time", emoji: "⏱️", label: "Time 20 swings", hint: "More swings → less reaction-time error." },
    ],
    distractors: [
      { id: "heat", emoji: "🔥", label: "Heat the bob", hint: "Why would you?" },
      { id: "stir", emoji: "🥄", label: "Stir vigorously", hint: "Wrong lab entirely." },
    ],
    reading: {
      prompt: "20 swings took 40.0 s with L = 1.00 m. g = ?",
      correct: "9.87 m/s²",
      options: ["4.93 m/s²", "9.87 m/s²", "19.7 m/s²", "0.99 m/s²"],
    },
  },
  {
    id: "physics_ohm", subject: "physics", name: "Ohm's Law circuit",
    goal: "Verify V = IR for a fixed resistor.",
    bench: "🔌", xp: 70, requiredLevel: 2, requiredQuizzes: 1,
    steps: [
      { id: "battery", emoji: "🔋", label: "Set up power supply", hint: "Start at 0 V, off." },
      { id: "resistor", emoji: "🟫", label: "Add the resistor", hint: "Fixed R in series." },
      { id: "ammeter", emoji: "🅰️", label: "Wire ammeter in series", hint: "Ammeter measures current — always series." },
      { id: "voltmeter", emoji: "🅥", label: "Wire voltmeter in parallel", hint: "Across the component you're measuring." },
      { id: "record", emoji: "📓", label: "Record V and I", hint: "Vary V, plot V vs I; slope = R." },
    ],
    distractors: [
      { id: "boil", emoji: "♨️", label: "Boil the wires", hint: "🙃" },
      { id: "ammeter_par", emoji: "❌", label: "Ammeter in parallel", hint: "Short circuit — would blow the fuse." },
    ],
    reading: {
      prompt: "V = 6.0 V, I = 0.30 A. R = ?",
      correct: "20 Ω",
      options: ["1.8 Ω", "20 Ω", "0.05 Ω", "200 Ω"],
    },
  },
  {
    id: "physics_refraction", subject: "physics", name: "Refraction through a prism",
    goal: "Measure the refractive index of glass.",
    bench: "🔺", xp: 70, requiredLevel: 3, requiredQuizzes: 2,
    steps: [
      { id: "paper", emoji: "📄", label: "Pin paper to board", hint: "Paper records ray paths." },
      { id: "prism", emoji: "🔺", label: "Trace prism outline", hint: "So you can return it to the same spot." },
      { id: "incident", emoji: "📐", label: "Mark incident ray", hint: "Use 2 pins along the ray." },
      { id: "emergent", emoji: "💡", label: "Mark emergent ray", hint: "Two more pins viewed through prism." },
      { id: "measure", emoji: "📏", label: "Measure angles", hint: "Use protractor; n = sin i / sin r." },
    ],
    distractors: [
      { id: "smash", emoji: "🔨", label: "Smash the prism", hint: "Definitely not." },
      { id: "water", emoji: "💧", label: "Pour water on it", hint: "Different experiment entirely." },
    ],
    reading: {
      prompt: "sin i = 0.60, sin r = 0.40. n = ?",
      correct: "1.50",
      options: ["0.67", "1.50", "1.00", "2.40"],
    },
  },
  // ---- CHEMISTRY ----
  {
    id: "chem_titration", subject: "chemistry", name: "Acid–Base Titration",
    goal: "Find unknown HCl concentration with NaOH.",
    bench: "⚗️", xp: 70, requiredLevel: 1, requiredQuizzes: 0,
    steps: [
      { id: "pipette", emoji: "💉", label: "Pipette 25 mL HCl", hint: "Accurate volume into conical flask." },
      { id: "indicator", emoji: "🌸", label: "Add phenolphthalein", hint: "Colourless in acid, pink at end-point." },
      { id: "burette", emoji: "🧫", label: "Fill burette w/ NaOH", hint: "Read meniscus at eye level." },
      { id: "titrate", emoji: "💧", label: "Titrate dropwise", hint: "Swirl flask; stop when pale pink stays." },
      { id: "record", emoji: "📓", label: "Record end volume", hint: "Repeat for concordant titres." },
    ],
    distractors: [
      { id: "shake", emoji: "🥤", label: "Shake the flask shut", hint: "Splash hazard — never seal." },
      { id: "boil", emoji: "♨️", label: "Boil the HCl", hint: "Not in this experiment." },
    ],
    reading: {
      prompt: "25.0 mL HCl needed 22.5 mL of 0.10 M NaOH. [HCl] = ?",
      correct: "0.090 M",
      options: ["0.090 M", "0.11 M", "0.225 M", "0.0090 M"],
    },
  },
  {
    id: "chem_flame", subject: "chemistry", name: "Flame tests",
    goal: "Identify metal ions by flame colour.",
    bench: "🔥", xp: 60, requiredLevel: 2, requiredQuizzes: 1,
    steps: [
      { id: "loop", emoji: "🔗", label: "Take Nichrome loop", hint: "Inert — won't add its own colour." },
      { id: "hcl", emoji: "🧴", label: "Dip in dilute HCl", hint: "Cleans contamination off the loop." },
      { id: "burn_clean", emoji: "🔥", label: "Burn loop until clean", hint: "Loop should give no colour." },
      { id: "sample", emoji: "🧂", label: "Dip in salt sample", hint: "Pick up a small amount." },
      { id: "observe", emoji: "👀", label: "Hold in blue flame", hint: "Note the colour produced." },
    ],
    distractors: [
      { id: "plastic", emoji: "🥄", label: "Use plastic spatula", hint: "Would melt." },
      { id: "water", emoji: "💧", label: "Dip in pure water", hint: "Doesn't clean ionic residue." },
    ],
    reading: {
      prompt: "Brick-red flame → which ion?",
      correct: "Ca²⁺",
      options: ["Na⁺", "K⁺", "Ca²⁺", "Cu²⁺"],
    },
  },
  {
    id: "chem_rates", subject: "chemistry", name: "Rate of reaction: Mg + HCl",
    goal: "Measure how concentration affects reaction rate.",
    bench: "🧫", xp: 70, requiredLevel: 2, requiredQuizzes: 1,
    steps: [
      { id: "mg", emoji: "🪙", label: "Weigh Mg ribbon", hint: "Equal mass each trial — fair test." },
      { id: "hcl", emoji: "🧪", label: "Measure 25 mL HCl", hint: "Vary concentration between trials." },
      { id: "gassyringe", emoji: "💉", label: "Connect gas syringe", hint: "Seals flask, measures H₂ produced." },
      { id: "start", emoji: "▶️", label: "Add Mg & start timer", hint: "Begin timing the instant they meet." },
      { id: "record", emoji: "📈", label: "Record volume every 10s", hint: "Plot V against t — slope = rate." },
    ],
    distractors: [
      { id: "flame", emoji: "🔥", label: "Light a Bunsen", hint: "Hydrogen + flame = bad day." },
      { id: "salt", emoji: "🧂", label: "Add table salt", hint: "Not a catalyst here." },
    ],
    reading: {
      prompt: "Doubling [HCl] roughly doubles rate. The reaction is…",
      correct: "First order in HCl",
      options: ["Zero order", "First order in HCl", "Second order in HCl", "Catalysed"],
    },
  },
  // ---- BIOLOGY ----
  {
    id: "bio_osmosis", subject: "biology", name: "Osmosis in potato cells",
    goal: "Show water moves down a concentration gradient.",
    bench: "🥔", xp: 60, requiredLevel: 1, requiredQuizzes: 0,
    steps: [
      { id: "cut", emoji: "🔪", label: "Cut equal potato cubes", hint: "Same surface area — fair test." },
      { id: "mass", emoji: "⚖️", label: "Weigh & record mass", hint: "Baseline mass for comparison." },
      { id: "salt", emoji: "🧂", label: "Prep salt solutions", hint: "Range of concentrations 0 → 1.0 M." },
      { id: "soak", emoji: "🥣", label: "Soak 30 min", hint: "Time for osmosis to occur." },
      { id: "remass", emoji: "📊", label: "Dry & re-weigh", hint: "Calculate % change in mass." },
    ],
    distractors: [
      { id: "fry", emoji: "🍟", label: "Fry the potato", hint: "Wrong subject!" },
      { id: "freeze", emoji: "🧊", label: "Freeze overnight", hint: "Would burst cells." },
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
  {
    id: "bio_food", subject: "biology", name: "Food tests",
    goal: "Identify nutrients in a mystery food.",
    bench: "🍞", xp: 70, requiredLevel: 2, requiredQuizzes: 1,
    steps: [
      { id: "grind", emoji: "🥣", label: "Grind food & add water", hint: "Make a solution to test." },
      { id: "iodine", emoji: "🟤", label: "Add iodine → starch", hint: "Blue-black = starch present." },
      { id: "benedict", emoji: "🔵", label: "Heat with Benedict's → sugar", hint: "Brick red = reducing sugar." },
      { id: "biuret", emoji: "🟣", label: "Add Biuret → protein", hint: "Purple = protein." },
      { id: "ethanol", emoji: "🍶", label: "Ethanol emulsion → fat", hint: "Cloudy white = lipid." },
    ],
    distractors: [
      { id: "eat", emoji: "🤤", label: "Just eat it", hint: "Lab samples are NEVER for eating." },
      { id: "vinegar", emoji: "🧴", label: "Add vinegar", hint: "Not a recognised test." },
    ],
    reading: {
      prompt: "Sample turned purple with Biuret. It contains…",
      correct: "Protein",
      options: ["Starch", "Reducing sugar", "Protein", "Lipid"],
    },
  },
  {
    id: "bio_photo", subject: "biology", name: "Photosynthesis rate",
    goal: "Count O₂ bubbles from pondweed at different light intensities.",
    bench: "🌿", xp: 70, requiredLevel: 3, requiredQuizzes: 2,
    steps: [
      { id: "weed", emoji: "🌿", label: "Cut pondweed stem", hint: "Fresh cut at 45° releases bubbles." },
      { id: "tube", emoji: "🧪", label: "Place in NaHCO₃ tube", hint: "CO₂ supply for the plant." },
      { id: "lamp", emoji: "💡", label: "Set lamp 10 cm away", hint: "Vary distance to change intensity." },
      { id: "wait", emoji: "⏳", label: "Wait 2 min to settle", hint: "Plant needs to acclimatise." },
      { id: "count", emoji: "🫧", label: "Count bubbles / min", hint: "Rate ∝ light intensity (until plateau)." },
    ],
    distractors: [
      { id: "soap", emoji: "🧼", label: "Add soap", hint: "Would harm the plant." },
      { id: "dark", emoji: "🌑", label: "Cover the lamp", hint: "Defeats the purpose." },
    ],
    reading: {
      prompt: "Bubble count plateaus at high intensity. Limiting factor is now…",
      correct: "CO₂ concentration or temperature",
      options: [
        "Light intensity",
        "CO₂ concentration or temperature",
        "Water availability",
        "Bubble size",
      ],
    },
  },
];

const SUBJECT_META = {
  physics:   { color: "#4D96FF", icon: Atom,   label: "Physics" },
  chemistry: { color: "#FF6B6B", icon: Beaker, label: "Chemistry" },
  biology:   { color: "#6BCB77", icon: Leaf,   label: "Biology" },
} as const;

function labSubjectsFor(subjects: { name: string }[]): Experiment["subject"][] {
  const names = subjects.map((s) => s.name.toLowerCase());
  const chosen = new Set<Experiment["subject"]>();
  if (names.some((name) => name.includes("physics") || name.includes("science"))) chosen.add("physics");
  if (names.some((name) => name.includes("chem") || name.includes("science"))) chosen.add("chemistry");
  if (names.some((name) => name.includes("bio") || name.includes("science"))) chosen.add("biology");
  return [...chosen];
}

function LabPage() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => EXPERIMENTS.find((e) => e.id === activeId) ?? null, [activeId]);
  const [allowedSubjects, setAllowedSubjects] = useState<Experiment["subject"][]>([]);
  const relevantExperiments = useMemo(
    () => EXPERIMENTS.filter((experiment) => allowedSubjects.includes(experiment.subject)),
    [allowedSubjects],
  );

  const [level, setLevel] = useState(1);
  const [passedQuizzes, setPassedQuizzes] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: q }, { data: subjects }] = await Promise.all([
        supabase.from("profiles").select("level").eq("user_id", user.id).maybeSingle(),
        supabase.from("quizzes").select("id, score, total, completed").eq("user_id", user.id).eq("completed", true),
        supabase.from("subjects").select("name").eq("user_id", user.id),
      ]);
      setLevel(p?.level ?? 1);
      setAllowedSubjects(labSubjectsFor(subjects ?? []));
      const passed = (q ?? []).filter((x: any) => x.total && (x.score ?? 0) / x.total >= 0.7).length;
      setPassedQuizzes(passed);
    })();
  }, [user, activeId]);

  if (!active) {
    return (
      <div className="bg-aurora min-h-[calc(100vh-3rem)] p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent">
              <Beaker className="h-3.5 w-3.5" /> Virtual Lab
            </div>
            <h1 className="font-display text-4xl font-bold text-gradient">Practical Paper — Game Mode</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick an experiment. Set up the apparatus. Take a reading. Earn XP.
              <br />
              <span className="text-xs">You're Level <b className="text-primary">{level}</b> • Passed quizzes: <b className="text-primary">{passedQuizzes}</b></span>
            </p>
          </header>
          {relevantExperiments.length === 0 && (
            <Card className="p-5 text-center text-sm text-muted-foreground">
              Add Physics, Chemistry, Biology, or Science in Study setup to unlock matching lab practicals.
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {relevantExperiments.map((e) => {
              const meta = SUBJECT_META[e.subject];
              const Icon = meta.icon;
              const locked = level < e.requiredLevel || passedQuizzes < e.requiredQuizzes;
              return (
                <Card
                  key={e.id}
                  onClick={() => !locked && setActiveId(e.id)}
                  className={`group relative cursor-pointer overflow-hidden border-2 p-5 shadow-pop transition ${locked ? "opacity-60" : "hover:-translate-y-1"}`}
                  style={{ borderColor: meta.color }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: meta.color }}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </div>
                    <span className="text-xs font-bold text-warning-foreground">+{e.xp} XP</span>
                  </div>
                  <div className="animate-bob text-6xl">{locked ? "🔒" : e.bench}</div>
                  <h2 className="mt-3 font-display text-xl font-bold">{e.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{e.goal}</p>
                  {locked ? (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted p-2 text-xs">
                      <Lock className="h-3.5 w-3.5" />
                      Need Lvl {e.requiredLevel} + {e.requiredQuizzes} passed quiz{e.requiredQuizzes === 1 ? "" : "zes"}
                    </div>
                  ) : (
                    <Button className="mt-4 w-full" style={{ background: meta.color, color: "white" }}>
                      Enter lab →
                    </Button>
                  )}
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
        fireConfetti("school");
        fireEmojiBurst("🏆");
        if (user) {
          await addXp(user.id, xp, { lab: true });
          await supabase.from("study_logs").insert({
            user_id: user.id, activity: `lab:${active.id}`, minutes: 10,
          });
          await bumpChallenge(user.id, "lab1");
          await checkLabBadges(user.id);
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
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [revealNext, setRevealNext] = useState(false);

  const pool = useMemo(() => {
    const all = [...experiment.steps, ...experiment.distractors];
    return all.sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiment.id]);

  const expectedIdx = placed.length;
  const expected = experiment.steps[expectedIdx];

  const click = (id: string) => {
    if (placed.includes(id)) return;
    if (expected && expected.id === id) {
      const next = [...placed, id];
      setPlaced(next);
      setWrongStreak(0);
      setRevealNext(false);
      fireEmojiBurst("✨");
      if (next.length === experiment.steps.length) {
        setTimeout(() => setPhase("reading"), 400);
      }
    } else {
      setMistakes((m) => m + 1);
      setWrongStreak((w) => {
        const nw = w + 1;
        if (nw >= 2) setRevealNext(true);
        return nw;
      });
      setShakeId(id);
      setTimeout(() => setShakeId(null), 400);
      fireEmojiBurst("❌");
      toast.error(`Not the right step yet — ${expected?.hint ?? "check the procedure"}`);
    }
  };

  const undo = () => {
    if (placed.length === 0) return;
    setPlaced(placed.slice(0, -1));
    setWrongStreak(0);
    setRevealNext(false);
    toast.message("Last step undone");
  };

  const showHint = () => {
    if (!expected) return;
    toast.message(`💡 ${expected.label}`, { description: expected.hint });
  };

  const reset = () => {
    setPlaced([]); setMistakes(0); setPhase("setup");
    setAnswer(null); setWrongStreak(0); setRevealNext(false);
  };

  const submitReading = (opt: string) => {
    setAnswer(opt);
    const correct = opt === experiment.reading.correct;
    if (correct) fireEmojiBurst("💯");
    const xp = Math.max(20, experiment.xp - mistakes * 5) + (correct ? 20 : 0);
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
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Procedure timeline</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={showHint}>
                        <Lightbulb className="h-3.5 w-3.5" /> Hint
                      </Button>
                      <Button size="sm" variant="outline" onClick={undo} disabled={placed.length === 0}>
                        <Undo2 className="h-3.5 w-3.5" /> Undo
                      </Button>
                    </div>
                  </div>
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
                  {revealNext && expected && (
                    <div className="mt-2 rounded-xl border border-warning bg-warning/15 p-2 text-xs">
                      🦉 Sasha AI suggests: <b>{expected.label}</b> — {expected.hint}
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tap the apparatus / action you need next
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {pool.map((s) => {
                      const done = placed.includes(s.id);
                      const highlight = revealNext && expected?.id === s.id;
                      const shaking = shakeId === s.id;
                      return (
                        <button
                          key={s.id}
                          disabled={done}
                          onClick={() => click(s.id)}
                          className={`group flex items-start gap-3 rounded-2xl border-2 bg-card p-3 text-left shadow-pop transition ${
                            done ? "opacity-30" : "hover:-translate-y-0.5 hover:border-primary"
                          } ${highlight ? "border-warning ring-2 ring-warning animate-bob" : ""} ${shaking ? "animate-shake border-destructive" : ""}`}
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
                <div className="text-sm text-muted-foreground">Clean lab. Counted toward your Lab XP and daily challenge.</div>
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
