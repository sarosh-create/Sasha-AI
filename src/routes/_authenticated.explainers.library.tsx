import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Library, Film, Play, Pause, Trash2, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/explainers/library")({
  head: () => ({
    meta: [
      { title: "Reel Library — Sasha AI" },
      { name: "description", content: "Browse your saved cartoon explainer reels with voiceover for every topic you have studied." },
      { property: "og:title", content: "Reel Library — Sasha AI" },
      { property: "og:description", content: "Browse your saved cartoon explainer reels with voiceover for every topic you have studied." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReelLibraryPage,
});

type Scene = { emoji: string; title: string; line: string; keyConcept?: boolean; timestampSec?: number };
type Reel = { id: string; topic: string; scenes: Scene[]; created_at: string };

function ReelLibraryPage() {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [active, setActive] = useState<Reel | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("explainer_reels" as any)
      .select("id, topic, scenes, created_at")
      .order("created_at", { ascending: false }) as any;
    setReels((data ?? []) as Reel[]);
  };
  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    await supabase.from("explainer_reels" as any).delete().eq("id", id);
    toast.success("Reel removed");
    if (active?.id === id) setActive(null);
    load();
  };

  if (active) return <ReelPlayer reel={active} onClose={() => setActive(null)} />;

  return (
    <div className="bg-aurora min-h-[calc(100vh-3rem)] p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <Library className="h-3.5 w-3.5" /> Reel Library
          </div>
          <h1 className="font-display text-4xl font-bold text-gradient">Your saved comedy reels</h1>
          <p className="mt-1 text-sm text-muted-foreground">Replay any topic with timestamped key concepts.</p>
        </header>

        {reels.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center shadow-pop">
            <Film className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No saved reels yet.</p>
            <Button asChild className="mt-4"><Link to="/explainers">Make your first reel</Link></Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reels.map((r) => {
              const keyCount = r.scenes.filter((s) => s.keyConcept).length;
              return (
                <div key={r.id} className="group flex flex-col rounded-2xl border bg-card p-4 shadow-pop transition hover:-translate-y-0.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    <button onClick={() => remove(r.id)} className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive" aria-label="Delete reel">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-3xl">{r.scenes[0]?.emoji}</div>
                  <div className="mt-2 font-display text-lg font-bold line-clamp-2">{r.topic}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.scenes.length} scenes • {keyCount} ⭐ key concepts
                  </div>
                  <Button className="mt-3" onClick={() => setActive(r)}>
                    <Play className="h-4 w-4" /> Replay
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ReelPlayer({ reel, onClose }: { reel: Reel; onClose: () => void }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (active < reel.scenes.length - 1) setActive(active + 1);
      else setPlaying(false);
    }, 8000);
    return () => clearTimeout(t);
  }, [playing, active, reel.scenes.length]);

  const totalSec = 60;
  const cur = reel.scenes[active];

  return (
    <div className="bg-aurora min-h-[calc(100vh-3rem)] p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>← Library</Button>
          <div className="font-display text-lg font-bold">{reel.topic}</div>
          <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause" : "Auto-play"}
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card shadow-pop">
          <div className="relative aspect-video bg-gradient-to-br from-warning/40 via-accent/20 to-primary/30">
            <div key={active} className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center animate-bob">
              <div className="text-8xl">{cur?.emoji}</div>
              <h2 className="mt-4 font-display text-3xl font-bold">{cur?.title}</h2>
              <p className="mt-2 max-w-lg text-lg text-muted-foreground">{cur?.line}</p>
              {cur?.keyConcept && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-warning/40 px-3 py-1 text-xs font-bold">
                  <Star className="h-3 w-3 fill-current" /> Key concept
                </div>
              )}
            </div>
            <div className="absolute top-3 right-3 rounded-full bg-background/80 px-2 py-0.5 text-xs font-bold backdrop-blur">
              {(cur?.timestampSec ?? 0)}s / {totalSec}s
            </div>
          </div>

          {/* Timeline */}
          <div className="relative h-12 border-t bg-muted/40 px-4">
            <div className="absolute inset-x-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
            {reel.scenes.map((s, i) => {
              const pct = ((s.timestampSec ?? (i / Math.max(1, reel.scenes.length - 1)) * totalSec) / totalSec) * 100;
              return (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  style={{ left: `calc(${pct}% + 1rem)` }}
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition ${i === active ? "scale-150" : ""}`}
                  aria-label={`Jump to scene ${i + 1}`}
                >
                  {s.keyConcept ? (
                    <Star className="h-5 w-5 fill-warning text-warning drop-shadow" />
                  ) : (
                    <div className={`h-3 w-3 rounded-full ${i === active ? "bg-primary" : "bg-foreground/50"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {reel.scenes.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex items-center gap-3 rounded-2xl border bg-card p-3 text-left transition hover:scale-[1.01] ${i === active ? "ring-2 ring-primary" : ""}`}
            >
              <span className="text-3xl">{s.emoji}</span>
              <div className="flex-1">
                <div className="font-display text-sm font-bold flex items-center gap-1">
                  {s.title} {s.keyConcept && <Star className="h-3 w-3 fill-warning text-warning" />}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">{s.line}</div>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{s.timestampSec ?? 0}s</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
