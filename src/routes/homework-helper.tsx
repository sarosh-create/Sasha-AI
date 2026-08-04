import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { Sparkles, Wand2, Brain, Pause, Play, Coffee, Cookie, Music2, Boxes, Mic } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/homework-helper")({
  head: () => ({
    meta: [
      { title: "AI Homework Helper — every subject, free | Sasha AI" },
      { name: "description", content: "Free magical AI homework helper for every subject. Hologram-style explanations, learning-style adaptation, brain-dump organiser, focus timer with breaks." },
      { name: "keywords", content: "ai homework helper, free homework help, hologram explainer, focus timer, brain dump organizer, all subjects" },
      { property: "og:title", content: "AI Homework Helper — every subject, free" },
      { property: "og:description", content: "Hologram explanations, learning-style tutoring, brain-dump organizer, focus timer." },
      { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/homework-helper" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "AI Homework Helper — every subject, free" },
      { name: "twitter:description", content: "Hologram explanations, learning-style tutoring, brain-dump organizer, focus timer." },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/homework-helper" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Sasha AI Homework Helper",
          url: "https://study-mentor-by-sarosh-ai.lovable.app/homework-helper",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          description:
            "Free AI homework helper for every subject: hologram-style explanations, learning-style tutoring, brain-dump organiser and a focus timer.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),

  component: HomeworkHelper,
});

const SUBJECTS = [
  "Mathematics", "Algebra", "Geometry", "Trigonometry", "Calculus", "Statistics", "Probability", "Discrete Math",
  "Physics", "Chemistry", "Biology", "Environmental Science", "Earth Science", "Astronomy", "Geology", "Anatomy",
  "Computer Science", "Programming", "Web Development", "Data Structures", "Algorithms", "Machine Learning", "Cybersecurity",
  "English Language", "English Literature", "Creative Writing", "Essay Writing", "Poetry", "Grammar", "Linguistics",
  "History", "World History", "US History", "European History", "Ancient History", "Modern History",
  "Geography", "Human Geography", "Physical Geography", "Economics", "Microeconomics", "Macroeconomics",
  "Business Studies", "Accounting", "Finance", "Marketing", "Management",
  "Psychology", "Sociology", "Philosophy", "Ethics", "Religious Studies", "Political Science", "Law", "Government",
  "Art", "Art History", "Music", "Music Theory", "Drama", "Film Studies", "Design", "Architecture",
  "Spanish", "French", "German", "Mandarin", "Japanese", "Arabic", "Hindi", "Latin", "Urdu", "Other Language",
  "Physical Education", "Health", "Nutrition", "Engineering", "Electrical Engineering", "Mechanical Engineering",
  "Medicine", "Nursing", "Pharmacology", "Veterinary Science", "Agriculture",
  "Other",
];

const LEARNING_STYLES = [
  { id: "default", label: "Just explain clearly", hint: "" },
  { id: "sports", label: "Sports fan", hint: "Use sports analogies (basketball trajectories, soccer angles, football strategy) wherever possible." },
  { id: "gaming", label: "Gamer", hint: "Frame the lesson as a quest with XP, levels, boss fights and skill trees. Use gaming metaphors." },
  { id: "visual", label: "Visual / hologram", hint: "Describe a vivid 3D scene the student can picture as if it were a hologram in their room. Use spatial language, color and motion." },
  { id: "story", label: "Storyteller", hint: "Wrap the explanation inside a short, vivid story with characters and stakes." },
  { id: "music", label: "Musician", hint: "Use rhythm, melody, harmony and song-structure analogies." },
  { id: "movies", label: "Movie buff", hint: "Use scenes, characters and plot beats from popular films as analogies." },
  { id: "child", label: "Explain like I'm 10", hint: "Use very simple words, short sentences and everyday objects only." },
];

const FOCUS_TRACKS = [
  { label: "Lofi beats (YouTube)", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
  { label: "Brain.fm focus", url: "https://www.brain.fm/" },
  { label: "Spotify deep focus", url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ" },
];

function HomeworkHelper() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm">Home</Button></Link>
          <Link to="/auth"><Button size="sm">Sign in — free</Button></Link>
        </nav>
      </header>

      <main className="container mx-auto max-w-4xl px-6 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Free · Every subject · Tuned to how you learn
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Your <span className="text-shimmer-gold">magical</span> homework helper
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
            Hologram-style explanations, brain-dump organiser, focus mode that "freezes time" — all backed by Sasha AI.
          </p>
        </div>

        <Tabs defaultValue="solve" className="mt-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="solve" className="gap-1"><Wand2 className="h-3.5 w-3.5" /> Solve</TabsTrigger>
            <TabsTrigger value="dump" className="gap-1"><Brain className="h-3.5 w-3.5" /> Brain dump</TabsTrigger>
            <TabsTrigger value="hologram" className="gap-1"><Boxes className="h-3.5 w-3.5" /> Hologram</TabsTrigger>
            <TabsTrigger value="focus" className="gap-1"><Pause className="h-3.5 w-3.5" /> Time freeze</TabsTrigger>
          </TabsList>

          <TabsContent value="solve">
            <h2 className="sr-only">Step-by-step homework solver</h2>
            <SolvePanel />
          </TabsContent>
          <TabsContent value="dump">
            <h2 className="sr-only">Brain dump organiser</h2>
            <BrainDumpPanel />
          </TabsContent>
          <TabsContent value="hologram">
            <h2 className="sr-only">Hologram-style topic walkthrough</h2>
            <HologramPanel />
          </TabsContent>
          <TabsContent value="focus">
            <h2 className="sr-only">Focus timer & time freeze</h2>
            <FocusPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

async function streamAI(opts: { system: string; user: string; onDelta: (s: string) => void }) {
  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
      }),
    },
  );
  if (resp.status === 429) { toast.error("Too many requests. Please wait a moment."); return; }
  if (resp.status === 402) { toast.error("AI credits exhausted — please try again later."); return; }
  if (!resp.ok || !resp.body) { toast.error("Couldn't reach the AI helper."); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) opts.onDelta(c);
      } catch { buf = line + "\n" + buf; break; }
    }
  }
}

function SolvePanel() {
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [style, setStyle] = useState("default");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const styleHint = useMemo(() => LEARNING_STYLES.find((s) => s.id === style)?.hint ?? "", [style]);

  const solve = async () => {
    const question = q.trim();
    if (!question) return;
    if (question.length > 4000) { toast.error("Please keep questions under 4000 characters."); return; }
    setLoading(true); setAnswer("");
    const system = `You are an expert homework helper for the subject: ${subject}. ${styleHint}
Return a clear, numbered step-by-step solution in markdown. End with a one-line **Answer:** summary. Be concise but show the working — do not skip steps. If the question is unclear, ask one short clarifying question.`;
    try {
      await streamAI({ system, user: question, onDelta: (c) => setAnswer((p) => p + c) });
    } finally { setLoading(false); }
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="solve-subject" className="text-xs uppercase tracking-wide text-muted-foreground">Subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger id="solve-subject" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="solve-style" className="text-xs uppercase tracking-wide text-muted-foreground">Teach me like a…</Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger id="solve-style" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{LEARNING_STYLES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Label htmlFor="solve-question" className="sr-only">Homework question</Label>
      <Textarea
        id="solve-question"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Paste your homework question here — any subject…"
        className="mt-3 min-h-[140px] resize-none text-base"
        maxLength={4000}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{q.length}/4000</span>
        <Button onClick={solve} disabled={loading || !q.trim()} size="lg">
          {loading ? "Solving…" : "Solve step-by-step"}
        </Button>
      </div>

      {(answer || loading) && (
        <article className="prose prose-sm mt-6 max-w-none rounded-xl border border-border bg-background/60 p-5 dark:prose-invert">
          {answer ? <ReactMarkdown>{answer}</ReactMarkdown> : <p className="text-muted-foreground">Thinking through the steps…</p>}
        </article>
      )}
    </div>
  );
}

function BrainDumpPanel() {
  const [raw, setRaw] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const toggleMic = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input isn't supported in this browser."); return; }
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      setRaw((p) => (p + " " + text).trim());
    };
    rec.onend = () => setListening(false);
    rec.start(); recRef.current = rec; setListening(true);
  };

  const organize = async () => {
    if (!raw.trim()) return;
    setLoading(true); setOut("");
    const system = `You take a student's messy, rambling spoken thoughts and turn them into a clean, well-structured outline for an essay or assignment.
Rules:
- KEEP the student's voice, vocabulary and personality — do NOT make it sound generic or overly formal.
- Produce a markdown outline: a thesis line, then 3-5 main points with 2-3 sub-bullets each.
- After the outline, add a short "Suggested opening sentence" in the student's voice.
- Do not invent facts the student didn't say.`;
    try {
      await streamAI({ system, user: raw, onDelta: (c) => setOut((p) => p + c) });
    } finally { setLoading(false); }
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-sm text-muted-foreground">Vent your messy thoughts (type or talk). I'll organise them into an outline — in your own voice.</p>
      <Label htmlFor="dump-raw" className="sr-only">Brain dump thoughts</Label>
      <Textarea
        id="dump-raw"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Just dump everything you're thinking about the topic, even if it's messy…"
        className="mt-3 min-h-[160px] resize-none"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button variant={listening ? "destructive" : "outline"} onClick={toggleMic} size="sm">
          <Mic className="h-4 w-4" /> {listening ? "Stop talking" : "Talk it out"}
        </Button>
        <Button onClick={organize} disabled={loading || !raw.trim()}>
          <Wand2 className="h-4 w-4" /> {loading ? "Organising…" : "Organise my brain"}
        </Button>
      </div>
      {(out || loading) && (
        <article className="prose prose-sm mt-5 max-w-none rounded-xl border border-border bg-background/60 p-5 dark:prose-invert">
          {out ? <ReactMarkdown>{out}</ReactMarkdown> : <p className="text-muted-foreground">Untangling your thoughts…</p>}
        </article>
      )}
    </div>
  );
}

function HologramPanel() {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Biology");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const project = async () => {
    if (!topic.trim()) return;
    setLoading(true); setOut("");
    const system = `You are a holographic study guide. The student wants to "see" a topic in 3D.
Produce a vivid, structured walkthrough in markdown that the student can picture as if a hologram was floating in front of them. Include:
1. **Scene** — what they see floating in the room (objects, scale, colors, motion).
2. **Walk-through** — 4-6 numbered steps where they zoom in / rotate / step inside the model to understand each part.
3. **Key labels** — bullet list of the important parts with one-line explanations.
4. **Reality check** — 2 short questions to test understanding.
Subject context: ${subject}. Be specific and concrete, not generic.`;
    try {
      await streamAI({ system, user: topic, onDelta: (c) => setOut((p) => p + c) });
    } finally { setLoading(false); }
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-sm text-muted-foreground">Pick a topic and I'll project it as a guided 3D scene you can "walk through" in your head.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div>
          <Label htmlFor="hologram-topic" className="sr-only">Hologram topic</Label>
          <Input id="hologram-topic" placeholder="e.g. The Battle of Yorktown, or a plant cell, or DNA replication" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="hologram-subject" className="sr-only">Hologram subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger id="hologram-subject"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={project} disabled={loading || !topic.trim()}>
          <Boxes className="h-4 w-4" /> {loading ? "Projecting…" : "Project hologram"}
        </Button>
      </div>
      {(out || loading) && (
        <article className="prose prose-sm mt-5 max-w-none rounded-xl border border-border bg-background/60 p-5 dark:prose-invert">
          {out ? <ReactMarkdown>{out}</ReactMarkdown> : <p className="text-muted-foreground">Warming up the projector…</p>}
        </article>
      )}
    </div>
  );
}

function FocusPanel() {
  const [minutes, setMinutes] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState<"idle" | "focus" | "break">("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "idle") {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (phase === "focus") {
            toast.success("Brain break! Stretch, sip water, eat that cookie 🍪");
            setPhase("break");
            return breakMin * 60;
          }
          toast.success("Back to it — time un-freezes ⏱️");
          setPhase("idle");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [phase, breakMin]);

  const start = () => { setPhase("focus"); setSecondsLeft(minutes * 60); toast("Time frozen ❄️ — deep focus mode."); };
  const stop = () => { setPhase("idle"); setSecondsLeft(0); };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-sm text-muted-foreground">Freeze time, lock into one task, then take a real brain break. Forced rest = better focus next round.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="focus-minutes" className="text-xs uppercase tracking-wide text-muted-foreground">Focus minutes</Label>
          <Input id="focus-minutes" type="number" min={5} max={120} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 25)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="break-minutes" className="text-xs uppercase tracking-wide text-muted-foreground">Break minutes</Label>
          <Input id="break-minutes" type="number" min={1} max={30} value={breakMin} onChange={(e) => setBreakMin(Number(e.target.value) || 5)} className="mt-1" />
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-border bg-background/60 p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{phase === "idle" ? "Ready" : phase === "focus" ? "❄️ Time frozen — deep focus" : "☕ Brain break"}</p>
        <p className="font-display text-6xl font-semibold tabular-nums">{mm}:{ss}</p>
        <div className="flex gap-2">
          {phase === "idle" ? (
            <Button onClick={start} size="lg"><Play className="h-4 w-4" /> Freeze time</Button>
          ) : (
            <Button onClick={stop} variant="outline" size="lg"><Pause className="h-4 w-4" /> End session</Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-3">
          <p className="flex items-center gap-2 text-sm font-medium"><Music2 className="h-4 w-4" /> Focus music</p>
          <ul className="mt-2 space-y-1 text-xs">
            {FOCUS_TRACKS.map((t) => (
              <li key={t.url}><a href={t.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{t.label}</a></li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="flex items-center gap-2 text-sm font-medium"><Coffee className="h-4 w-4" /> Break ideas</p>
          <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
            <li>Stand up, roll your shoulders, look out the window for 20 seconds</li>
            <li>Drink a glass of water</li>
            <li>Do 10 jumping jacks</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="flex items-center gap-2 text-sm font-medium"><Cookie className="h-4 w-4" /> Snack fuel</p>
          <p className="mt-2 text-xs text-muted-foreground">Warm cookie + cold milk, a handful of almonds, or fruit + dark chocolate. Real fuel, not just sugar.</p>
        </div>
      </div>
    </div>
  );
}
