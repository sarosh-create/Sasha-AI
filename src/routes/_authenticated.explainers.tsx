import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, Film, Wand2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/explainers")({
  component: ExplainersPage,
});

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

const PRESETS = [
  { topic: "Photosynthesis", emoji: "🌱☀️" },
  { topic: "Newton's 3rd law", emoji: "🚀💥" },
  { topic: "Mitosis", emoji: "🧬✂️" },
  { topic: "Quadratic formula", emoji: "📐🤯" },
  { topic: "Acids & bases", emoji: "🧪🌈" },
  { topic: "Cold War in 60s", emoji: "🥶🗺️" },
];

const SYSTEM = `You are a stand-up comedian who also happens to be the world's best tutor.
Write a SHORT, HILARIOUS 60-second explainer of the topic the student gives you.
RULES:
- Strict format: a JSON array of 6 to 8 "scenes", returned in a markdown code block.
- Each scene: { "emoji": "1-3 emojis", "title": "punchy <6 words", "line": "1 short funny sentence that actually teaches" }
- The jokes must teach the real concept, not replace it.
- No preamble, no closing remarks, JUST the json code block.
Example:
\`\`\`json
[
  {"emoji":"🌱","title":"Meet Planty","line":"Plants are basically solar-powered burrito factories."}
]
\`\`\``;

type Scene = { emoji: string; title: string; line: string };

function ExplainersPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [active, setActive] = useState(0);

  const generate = async (t: string) => {
    if (!t.trim()) return;
    setLoading(true);
    setScenes([]);
    setActive(0);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          system: SYSTEM,
          messages: [{ role: "user", content: `Topic: ${t}` }],
        }),
      });
      if (resp.status === 429) { toast.error("Rate limit. Hang on a sec."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok || !resp.body) throw new Error("stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let i: number;
        while ((i = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, i);
          buffer = buffer.slice(i + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const ch = p.choices?.[0]?.delta?.content as string | undefined;
            if (ch) acc += ch;
          } catch { /* keep */ }
        }
      }
      const match = acc.match(/```json\s*([\s\S]*?)```/i) ?? acc.match(/\[([\s\S]*)\]/);
      const raw = match ? (match[0].startsWith("[") ? match[0] : match[1]) : acc;
      const parsed = JSON.parse(raw) as Scene[];
      setScenes(parsed);
    } catch (e: any) {
      toast.error(e.message ?? "Could not generate explainer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-aurora min-h-[calc(100vh-3rem)] p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-warning/30 px-3 py-1 text-xs font-semibold text-warning-foreground">
            <Film className="h-3.5 w-3.5" /> Funny Explainers
          </div>
          <h1 className="font-display text-4xl font-bold text-gradient">Learn it in 60 seconds (with jokes)</h1>
          <p className="mt-2 text-sm text-muted-foreground">Type any topic. Kata writes a tiny comedy reel that actually teaches it.</p>
        </header>

        <div className="rounded-2xl border bg-card p-4 shadow-pop">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. how does a transformer work?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate(topic)}
            />
            <Button onClick={() => generate(topic)} disabled={loading || !topic.trim()}>
              {loading ? <Sparkles className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              <span className="ml-1">{loading ? "Writing..." : "Make reel"}</span>
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.topic}
                onClick={() => { setTopic(p.topic); generate(p.topic); }}
                className="rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition hover:scale-105 hover:bg-warning/40"
              >
                {p.emoji} {p.topic}
              </button>
            ))}
          </div>
        </div>

        {scenes.length > 0 && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border bg-card shadow-pop">
              <div className="relative aspect-video bg-gradient-to-br from-warning/40 via-accent/20 to-primary/30">
                <div key={active} className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="animate-bob text-8xl">{scenes[active]?.emoji}</div>
                  <h2 className="mt-4 font-display text-3xl font-bold">{scenes[active]?.title}</h2>
                  <p className="mt-2 max-w-lg text-lg text-muted-foreground">{scenes[active]?.line}</p>
                </div>
                <div className="absolute top-3 right-3 rounded-full bg-background/80 px-2 py-0.5 text-xs font-bold backdrop-blur">
                  {active + 1} / {scenes.length}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t bg-muted/40 p-3">
                <Button variant="outline" size="sm" onClick={() => setActive((a) => Math.max(0, a - 1))} disabled={active === 0}>
                  ← Back
                </Button>
                <div className="flex flex-1 justify-center gap-1">
                  {scenes.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={`h-1.5 rounded-full transition-all ${i === active ? "w-8 bg-primary" : "w-3 bg-border"}`}
                    />
                  ))}
                </div>
                <Button size="sm" onClick={() => setActive((a) => Math.min(scenes.length - 1, a + 1))} disabled={active === scenes.length - 1}>
                  Next →
                </Button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {scenes.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`flex items-center gap-3 rounded-2xl border bg-card p-3 text-left transition hover:scale-[1.01] ${i === active ? "ring-2 ring-primary" : ""}`}
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <div className="flex-1">
                    <div className="font-display text-sm font-bold">{s.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{s.line}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={() => generate(topic)} disabled={loading}>
                <RefreshCw className="h-4 w-4" /> Remix this reel
              </Button>
            </div>
          </div>
        )}

        {loading && scenes.length === 0 && (
          <div className="rounded-2xl border bg-card p-10 text-center shadow-pop">
            <div className="animate-wiggle text-6xl">🎬</div>
            <div className="mt-3 text-sm text-muted-foreground">Kata is writing your comedy script…</div>
          </div>
        )}
      </div>
    </div>
  );
}

// keep import to avoid tree-shaking complaints — markdown reserved for future use
void ReactMarkdown;
