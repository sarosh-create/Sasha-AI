import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Feather, Sparkles, Target, Flame, Clock, BookOpen, ShieldCheck, Brain, Palette } from "lucide-react";
import falconLogo from "@/assets/falcon-logo.png";
import { TalkingFalcon, readFalconCustomization, saveFalconCustomization, type FalconTheme } from "@/components/talking-falcon";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/falcon")({
  component: GuardianFalcon,
  head: () => ({
    meta: [
      { title: "Guardian Falcon — Your AI study guardian | Sasha AI" },
      { name: "description", content: "The Guardian Falcon watches your progress, hunts your weaknesses, and tells you exactly what to study next — personalised every day." },
    ],
  }),
});

type Plan = {
  headline: string;
  readiness_pct: number;
  stress_level: "calm" | "stretched" | "burnout-risk";
  today: { title: string; subject?: string; minutes: number; why: string; kind: "revise"|"practice"|"new"|"rest"|"read" }[];
  weak_focus: string[];
  falcon_message: string;
};
type Dna = {
  learning_style: string | null;
  strengths: string[];
  weaknesses: string[];
  attention_minutes: number;
  retention_score: number;
  summary: string | null;
};

const FN = (n: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${n}`;

function GuardianFalcon() {
  const { user, session } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [dna, setDna] = useState<Dna | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyDna, setBusyDna] = useState(false);

  const authHeader = () => ({
    Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  });

  const loadDna = async () => {
    if (!user) return;
    const { data } = await supabase.from("learning_dna").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setDna(data as any);
  };

  const summon = async () => {
    setBusy(true);
    try {
      const r = await fetch(FN("guardian-falcon"), { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: "{}" });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falcon is resting");
      const j = await r.json();
      setPlan(j.plan);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const refreshDna = async () => {
    setBusyDna(true);
    try {
      const r = await fetch(FN("learning-dna"), { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: "{}" });
      if (!r.ok) throw new Error((await r.json()).error ?? "DNA scan failed");
      await loadDna();
      toast.success("Learning DNA updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusyDna(false); }
  };

  useEffect(() => { loadDna(); }, [user]);

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-falcon p-8 shadow-falcon">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,oklch(0.78_0.13_80/0.25),transparent_60%)]" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
          <img src={falconLogo} alt="Guardian Falcon" className="h-28 w-28 animate-soar drop-shadow-2xl" />
          <div className="flex-1">
            <Badge className="mb-3 border-falcon-gold/40 bg-falcon-gold/15 text-falcon-gold hover:bg-falcon-gold/20">
              <Feather className="mr-1 h-3 w-3" /> Guardian Falcon
            </Badge>
            <h1 className="font-display text-4xl font-semibold leading-tight text-white">
              I see your <span className="text-shimmer-gold">whole battlefield</span>.
            </h1>
            <p className="mt-2 max-w-xl text-white/80">
              Every weak topic, every exam date, every mistake. Tell me to scan — I'll tell you exactly what matters today.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={summon} disabled={busy} size="lg" className="bg-falcon-gold text-falcon-navy hover:bg-falcon-gold/90">
                <Sparkles className="mr-2 h-4 w-4" /> {busy ? "Scanning the horizon…" : plan ? "Re-scan" : "Summon the Falcon"}
              </Button>
              <Button onClick={refreshDna} disabled={busyDna} size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Brain className="mr-2 h-4 w-4" /> {busyDna ? "Reading…" : "Refresh Learning DNA"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <FalconCustomizer />

      {/* Plan */}
      {plan && (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Today's headline</p>
                <h2 className="mt-1 font-display text-xl font-semibold">{plan.headline}</h2>
              </div>
              <Badge variant="outline" className={plan.stress_level === "burnout-risk" ? "border-destructive text-destructive" : plan.stress_level === "stretched" ? "border-warning text-warning" : "border-success text-success"}>
                <Flame className="mr-1 h-3 w-3" /> {plan.stress_level}
              </Badge>
            </div>
            <div className="mt-5 space-y-3">
              {plan.today.map((t, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4">
                  <div className="rounded-lg bg-falcon-gold/15 p-2 text-falcon-gold-deep">
                    {t.kind === "rest" ? <Clock className="h-4 w-4" /> : t.kind === "practice" ? <Target className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.subject ? `${t.subject} · ` : ""}{t.minutes} min · {t.why}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">{t.kind}</Badge>
                </div>
              ))}
            </div>
            <blockquote className="mt-5 border-l-2 border-falcon-gold pl-4 italic text-muted-foreground">
              "{plan.falcon_message}"
            </blockquote>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Exam readiness</p>
              <p className="mt-1 font-display text-4xl font-semibold">{plan.readiness_pct}%</p>
              <Progress value={plan.readiness_pct} className="mt-3" />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Hunt list</p>
              <div className="mt-3 space-y-2">
                {plan.weak_focus.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Target className="h-3.5 w-3.5 text-falcon-gold-deep" /> {w}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DNA */}
      {dna && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-falcon-gold-deep" />
            <h2 className="font-display text-lg font-semibold">Your Learning DNA</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{dna.summary}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <Stat label="Style" value={dna.learning_style ?? "—"} />
            <Stat label="Focus span" value={`${dna.attention_minutes} min`} />
            <Stat label="Retention" value={`${dna.retention_score}%`} />
            <Stat label="Weak areas" value={String(dna.weaknesses?.length ?? 0)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Tags label="Strengths" items={dna.strengths} tone="success" />
            <Tags label="Weaknesses" items={dna.weaknesses} tone="warning" />
          </div>
        </div>
      )}

      {!plan && !dna && (
        <div className="mt-10 text-center text-sm text-muted-foreground">
          Summon the Falcon and refresh your Learning DNA to get started.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold capitalize">{value}</p>
    </div>
  );
}
function Tags({ label, items, tone }: { label: string; items: string[]; tone: "success" | "warning" }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items?.length ? items.map((s, i) => (
          <Badge key={i} variant="outline" className={tone === "success" ? "border-success/40 text-success" : "border-warning/40 text-warning"}>{s}</Badge>
        )) : <span className="text-xs text-muted-foreground">None yet.</span>}
      </div>
    </div>
  );
}

const THEME_OPTIONS: { id: FalconTheme; label: string; swatch: string }[] = [
  { id: "slate", label: "Slate (Peregrine)", swatch: "#2f3845" },
  { id: "desert", label: "Desert (Saker)", swatch: "#7d5a36" },
  { id: "midnight", label: "Midnight", swatch: "#23264a" },
  { id: "arctic", label: "Arctic (Gyrfalcon)", swatch: "#9aa6b4" },
  { id: "ember", label: "Ember", swatch: "#6b2a1f" },
];

function FalconCustomizer() {
  const [c, setC] = useState(() => readFalconCustomization());
  const update = (patch: Partial<typeof c>) => {
    const next = { ...c, ...patch };
    setC(next);
    saveFalconCustomization(next);
  };
  const theme = c.theme ?? "slate";
  const glow = c.eyeGlow ?? 0.5;
  const detail = c.featherDetail ?? 0.6;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-falcon-gold-deep" />
        <h2 className="font-display text-lg font-semibold">Customize your Falcon</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Pick a plumage, dial in the eye glow, and adjust feather detail. Saved on this device.</p>

      <div className="mt-5 grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="flex justify-center rounded-xl border border-border bg-background p-3">
          <TalkingFalcon name="you" compact lines={["Looking sharp."]} />
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Color theme</p>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => update({ theme: t.id })}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${theme === t.id ? "border-falcon-gold bg-falcon-gold/15" : "border-border hover:bg-accent"}`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: t.swatch }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Eye glow · {Math.round(glow * 100)}%</p>
            <Slider value={[glow * 100]} min={0} max={100} step={5} onValueChange={(v) => update({ eyeGlow: v[0] / 100 })} />
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Feather detail · {Math.round(detail * 100)}%</p>
            <Slider value={[detail * 100]} min={0} max={100} step={5} onValueChange={(v) => update({ featherDetail: v[0] / 100 })} />
          </div>
        </div>
      </div>
    </div>
  );
}
