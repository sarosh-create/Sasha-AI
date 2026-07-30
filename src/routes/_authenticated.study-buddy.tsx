import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Send, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TalkingFalcon,
  readFalconCustomization,
  saveFalconCustomization,
  type FalconTheme,
} from "@/components/talking-falcon";

export const Route = createFileRoute("/_authenticated/study-buddy")({
  component: StudyBuddyPage,
  head: () => ({
    meta: [
      { title: "Design Your Study Buddy — Sasha AI" },
      {
        name: "description",
        content:
          "Create and customise your own AI study buddy — name it, style it, pick its personality, then chat with it in a magical-realist study world.",
      },
      { property: "og:title", content: "Design Your Study Buddy — Sasha AI" },
      {
        property: "og:description",
        content: "Customise your AI study buddy's look, name and personality, then study together.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/study-buddy" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Design Your Study Buddy — Sasha AI" },
      {
        name: "twitter:description",
        content: "Customise your AI study buddy's look, name and personality, then study together.",
      },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/study-buddy" }],
  }),
});

const THEMES: { id: FalconTheme; label: string }[] = [
  { id: "slate", label: "Slate" },
  { id: "desert", label: "Desert" },
  { id: "midnight", label: "Midnight" },
  { id: "arctic", label: "Arctic" },
  { id: "ember", label: "Ember" },
];

const PERSONALITIES = [
  { id: "bestie", label: "Bestie", blurb: "warm, funny, always in your corner" },
  { id: "coach", label: "Coach", blurb: "direct, high-energy, pushes you" },
  { id: "sage", label: "Sage", blurb: "calm, thoughtful, deep explanations" },
  { id: "chaos", label: "Chaos Goblin", blurb: "unhinged jokes, still weirdly correct" },
];

type BuddyConfig = {
  name: string;
  species: string;
  personality: string;
  quirk: string;
  theme: FalconTheme;
  eyeGlow: number;
  featherDetail: number;
};

const DEFAULTS: BuddyConfig = {
  name: "Zephyr",
  species: "peregrine falcon",
  personality: "bestie",
  quirk: "keeps a pocket full of impossible snacks",
  theme: "slate",
  eyeGlow: 0.5,
  featherDetail: 0.6,
};

function readBuddy(): BuddyConfig {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem("sasha:buddy");
    const custom = readFalconCustomization();
    return {
      ...DEFAULTS,
      ...(raw ? JSON.parse(raw) : {}),
      theme: (custom.theme ?? DEFAULTS.theme) as FalconTheme,
      eyeGlow: custom.eyeGlow ?? DEFAULTS.eyeGlow,
      featherDetail: custom.featherDetail ?? DEFAULTS.featherDetail,
    };
  } catch {
    return DEFAULTS;
  }
}

function buddySystemPrompt(b: BuddyConfig) {
  const p = PERSONALITIES.find((x) => x.id === b.personality) ?? PERSONALITIES[0];
  return `You are ${b.name}, a ${b.species} who is the student's personal study buddy. You exist in a magical-realist world where studying bends reality: equations hum, chapters of history walk into the room, cells gossip about mitosis. Treat these wonders as completely ordinary.

Personality: ${p.label} — ${p.blurb}.
Signature quirk: ${b.quirk}.

Rules:
- Always teach for real. The magic is the wrapper, never a replacement for correct, exam-accurate content.
- Explain step by step, check understanding with one short question, and keep answers tight.
- Speak like a close friend: warm, playful, never condescending. Use the student's own words back to them.
- When the student is stressed, notice it first and steady them before the content.
- Use small sensory details from the magical world (a diagram unfolding like a paper bird) — one or two per reply, no more.
- Use markdown, short paragraphs, and bold the key idea once per answer.`;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

type Msg = { role: "user" | "assistant"; content: string };

function StudyBuddyPage() {
  const [buddy, setBuddy] = useState<BuddyConfig>(DEFAULTS);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setBuddy(readBuddy()), []);

  const update = (patch: Partial<BuddyConfig>) => {
    setBuddy((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("sasha:buddy", JSON.stringify(next));
      saveFalconCustomization({
        theme: next.theme,
        eyeGlow: next.eyeGlow,
        featherDetail: next.featherDetail,
      });
      return next;
    });
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, system: buddySystemPrompt(buddy) }),
      });
      if (resp.status === 429) throw new Error("Rate limit reached. Wait a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted.");
      if (!resp.ok || !resp.body) throw new Error("Your buddy could not be reached.");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
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
          if (line.startsWith(":") || !line.trim()) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const chunk = JSON.parse(json).choices?.[0]?.delta?.content as string | undefined;
            if (chunk) {
              acc += chunk;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <Wand2 className="h-6 w-6 text-primary" /> Your Study Buddy
        </h1>
        <p className="text-muted-foreground text-sm">
          Design your buddy, then study together. Everything saves instantly on this device.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Design</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex justify-center">
              <TalkingFalcon
                name={buddy.name}
                mood="happy"
                theme={buddy.theme}
                eyeGlow={buddy.eyeGlow}
                featherDetail={buddy.featherDetail}
                lines={[`Hey, I'm ${buddy.name}. Ready when you are.`]}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="buddy-name">Name</Label>
                <Input
                  id="buddy-name"
                  value={buddy.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Zephyr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="buddy-species">Creature</Label>
                <Input
                  id="buddy-species"
                  value={buddy.species}
                  onChange={(e) => update({ species: e.target.value })}
                  placeholder="peregrine falcon, dragon, robot cat…"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Personality</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => update({ personality: p.id })}
                    className={`rounded-lg border p-2 text-left text-xs transition ${
                      buddy.personality === p.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span className="block font-semibold">{p.label}</span>
                    <span className="text-muted-foreground">{p.blurb}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="buddy-quirk">Signature quirk</Label>
              <Textarea
                id="buddy-quirk"
                rows={2}
                value={buddy.quirk}
                onChange={(e) => update({ quirk: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Colour theme</Label>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => update({ theme: t.id })}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      buddy.theme === t.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Eye glow</Label>
              <Slider
                value={[buddy.eyeGlow]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => update({ eyeGlow: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Feather / detail intensity</Label>
              <Slider
                value={[buddy.featherDetail]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => update({ featherDetail: v })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-[520px] flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-primary" /> Chat with {buddy.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <ScrollArea className="h-[360px] pr-3" viewportRef={scrollRef as never}>
              <div ref={scrollRef} className="space-y-3">
                {messages.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Ask {buddy.name} anything — a topic, a panic, a past paper question.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-3 text-sm ${
                      m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Textarea
                rows={2}
                value={input}
                placeholder={`Message ${buddy.name}…`}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button onClick={() => void send()} disabled={streaming || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
