import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Send, Sparkles, Volume2, VolumeX, Wand2, User2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/study-buddy")({
  head: () => ({
    meta: [
      { title: "Study Buddy — your magical realist study companion" },
      { name: "description", content: "Build your own talking AI study buddy. Pick its name, look and voice. A magical-realist peer that quizzes you, keeps you focused, and turns facts into artifacts." },
      { property: "og:title", content: "Study Buddy — magical realist AI companion" },
      { property: "og:description", content: "Design your own talking study buddy. Surreal metaphors, voice replies, judgment-free focus." },
      { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/study-buddy" },
      { name: "twitter:title", content: "Study Buddy — magical realist AI companion" },
      { name: "twitter:description", content: "Design your own talking study buddy. Surreal metaphors, voice replies, judgment-free focus." },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/study-buddy" }],
  }),
  component: StudyBuddyPage,
});

type Buddy = {
  name: string;
  emoji: string;
  color: string;
  personality: "warm" | "dry" | "playful" | "calm";
  pitch: number;
  rate: number;
  voiceURI?: string;
  speakReplies: boolean;
};

const DEFAULT_BUDDY: Buddy = {
  name: "Mira",
  emoji: "🦊",
  color: "#a78bfa",
  personality: "dry",
  pitch: 1,
  rate: 1,
  speakReplies: true,
};

const EMOJI_CHOICES = ["🦊","🦉","🐉","🐢","🐙","🦄","🦊","🐺","🐱","🐧","🦋","🐝","🐳","🌙","⭐","🪐","🧚","🧙","🐲","🦔"];
const PERSONALITIES: Record<Buddy["personality"], string> = {
  warm: "Warm, encouraging older-sibling energy.",
  dry: "Dry, slightly tired wit. Deadpan delivery.",
  playful: "Playful, mischievous, gently teasing.",
  calm: "Calm, slow, almost meditative.",
};

const STORAGE_KEY = "sasha:study-buddy";

function readBuddy(): Buddy {
  if (typeof window === "undefined") return DEFAULT_BUDDY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BUDDY;
    return { ...DEFAULT_BUDDY, ...JSON.parse(raw) };
  } catch { return DEFAULT_BUDDY; }
}

function saveBuddy(b: Buddy) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); } catch {}
}

const SYSTEM_PROMPT = (b: Buddy) => `Act as a Study Buddy within a magical realist world. Your name is ${b.name}. Treat the bizarre as completely ordinary. 1) Environment shifts based on focus (e.g., clock stops, dust motes spell out the messages the student is avoiding, snow falls indoors without wetting the pages). 2) Explain topics using concrete, impossible metaphors (e.g., photosynthesis is a tiny green library weaving sunlight into paper blankets). 3) Graded memories look like artifacts (e.g., a brass key that smells faintly of rain, a heavy iron nail driven into the timeline). 4) Procrastination has surreal consequences — never lecture; warn gently with surreal stakes (textbook pages turning into blank sand). Personality: ${PERSONALITIES[b.personality]} Keep the tone casual, dryly witty, and deeply empathetic. Keep replies short — 2-4 sentences usually. Use plain text suitable for being spoken aloud; avoid markdown headings and code blocks. Do not break character.`;

function StudyBuddyPage() {
  const [buddy, setBuddy] = useState<Buddy>(DEFAULT_BUDDY);
  useEffect(() => { setBuddy(readBuddy()); }, []);
  const update = (patch: Partial<Buddy>) => setBuddy((b) => { const n = { ...b, ...patch }; saveBuddy(n); return n; });

  return (
    <div className="container mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Magical realist · Talks back · Yours to design
        </div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Your Study Buddy</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A grounded, slightly tired peer who treats the surreal as completely ordinary. Design yours, then chat — they'll talk back out loud.</p>
      </header>

      <Tabs defaultValue="chat">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" className="gap-1"><Send className="h-3.5 w-3.5" /> Talk to {buddy.name}</TabsTrigger>
          <TabsTrigger value="design" className="gap-1"><Wand2 className="h-3.5 w-3.5" /> Design buddy</TabsTrigger>
        </TabsList>
        <TabsContent value="chat"><ChatPanel buddy={buddy} /></TabsContent>
        <TabsContent value="design"><DesignPanel buddy={buddy} update={update} /></TabsContent>
      </Tabs>
    </div>
  );
}

function BuddyAvatar({ buddy, size = 64 }: { buddy: Buddy; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, background: `radial-gradient(circle at 30% 30%, ${buddy.color}, color-mix(in oklab, ${buddy.color} 40%, transparent))` }}
      className="flex shrink-0 items-center justify-center rounded-full text-3xl shadow-card ring-2 ring-border"
      aria-label={`${buddy.name} avatar`}
    >
      <span style={{ fontSize: size * 0.55 }}>{buddy.emoji}</span>
    </div>
  );
}

function DesignPanel({ buddy, update }: { buddy: Buddy; update: (p: Partial<Buddy>) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices?.() ?? []);
    load();
    window.speechSynthesis?.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", load);
  }, []);

  const preview = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) { toast.error("Voice not supported in this browser."); return; }
    const u = new SpeechSynthesisUtterance(`Hi. I'm ${buddy.name}. The clock just stopped ticking — we have all the time we need.`);
    u.pitch = buddy.pitch; u.rate = buddy.rate;
    const v = voices.find((x) => x.voiceURI === buddy.voiceURI);
    if (v) u.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="mt-4 grid gap-5 rounded-2xl border border-border bg-card p-5 shadow-card md:grid-cols-[200px_1fr]">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background/60 p-4">
        <BuddyAvatar buddy={buddy} size={120} />
        <p className="text-center font-medium">{buddy.name}</p>
        <Button size="sm" variant="outline" onClick={preview}><Volume2 className="h-4 w-4" /> Preview voice</Button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Name</label>
          <Input value={buddy.name} onChange={(e) => update({ name: e.target.value.slice(0, 24) })} className="mt-1" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Avatar</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {EMOJI_CHOICES.map((e, i) => (
              <button key={i} onClick={() => update({ emoji: e })}
                className={`h-10 w-10 rounded-lg border text-xl ${buddy.emoji === e ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-accent"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Aura color</label>
            <Input type="color" value={buddy.color} onChange={(e) => update({ color: e.target.value })} className="mt-1 h-10" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Personality</label>
            <Select value={buddy.personality} onValueChange={(v) => update({ personality: v as Buddy["personality"] })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PERSONALITIES) as Buddy["personality"][]).map((k) => (
                  <SelectItem key={k} value={k}>{k} — {PERSONALITIES[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Voice</label>
          <Select value={buddy.voiceURI ?? ""} onValueChange={(v) => update({ voiceURI: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Default browser voice" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {voices.map((v) => (<SelectItem key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Pitch ({buddy.pitch.toFixed(2)})</label>
            <Slider min={0.5} max={2} step={0.05} value={[buddy.pitch]} onValueChange={([v]) => update({ pitch: v })} className="mt-2" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Rate ({buddy.rate.toFixed(2)})</label>
            <Slider min={0.5} max={1.6} step={0.05} value={[buddy.rate]} onValueChange={([v]) => update({ rate: v })} className="mt-2" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={buddy.speakReplies} onChange={(e) => update({ speakReplies: e.target.checked })} />
          Speak replies aloud automatically
        </label>
      </div>
    </div>
  );
}

type Msg = { role: "user" | "assistant"; content: string };

function ChatPanel({ buddy }: { buddy: Buddy }) {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: `Pull up a chair. The clock on the wall just stopped — that's its way of saying we have the time. What are we tackling?` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const system = useMemo(() => SYSTEM_PROMPT(buddy), [buddy]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const speak = (text: string) => {
    if (muted || !buddy.speakReplies || typeof window === "undefined" || !window.speechSynthesis) return;
    const clean = text.replace(/[*_`#>]/g, "");
    const u = new SpeechSynthesisUtterance(clean);
    u.pitch = buddy.pitch; u.rate = buddy.rate;
    const v = window.speechSynthesis.getVoices().find((x) => x.voiceURI === buddy.voiceURI);
    if (v) u.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    let acc = "";
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ system, messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (resp.status === 429) { toast.error("Easy — too many requests."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok || !resp.body) { toast.error("Couldn't reach your buddy."); return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) { acc += c; setMessages((m) => { const cp = [...m]; cp[cp.length - 1] = { role: "assistant", content: acc }; return cp; }); }
          } catch {}
        }
      }
      speak(acc);
    } finally { setLoading(false); }
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <BuddyAvatar buddy={buddy} size={44} />
          <div>
            <p className="font-medium">{buddy.name}</p>
            <p className="text-xs text-muted-foreground">your study buddy · always in character</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setMuted((m) => !m); if (!muted) window.speechSynthesis?.cancel(); }}>
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? "Muted" : "Voice on"}
        </Button>
      </div>

      <section className="max-h-[55vh] space-y-4 overflow-y-auto p-4" aria-label="conversation">
        <h2 className="sr-only">Conversation</h2>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            {m.role === "assistant" ? <BuddyAvatar buddy={buddy} size={32} /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><User2 className="h-4 w-4" /></div>}
            <article className={`prose prose-sm max-w-[80%] rounded-2xl px-3 py-2 dark:prose-invert ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background/60 border border-border"}`}>
              {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : <span className="text-muted-foreground">…</span>}
            </article>
          </div>
        ))}
        <div ref={bottomRef} />
      </section>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Tell ${buddy.name} what you're studying…`}
            className="min-h-[52px] resize-none"
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="lg"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
