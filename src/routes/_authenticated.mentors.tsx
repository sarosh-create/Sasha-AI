import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Heart, Gavel, Flame, GraduationCap, Repeat, Brain, Compass, Briefcase } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mentors")({
  component: Mentors,
  head: () => ({ meta: [
    { title: "AI Teacher Ecosystem — 8 personalities | Sasha AI" },
    { name: "description", content: "Switch instantly between 8 AI teaching personalities — friendly mentor, strict examiner, coach, specialist, strategist and more." },
      { property: "og:title", content: "AI Teacher Ecosystem — 8 personalities | Sasha AI" },
      { property: "og:description", content: "Switch instantly between 8 AI teaching personalities — friendly mentor, strict examiner, coach, specialist, strategist and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

const PERSONAS = [
  { id: "friendly", name: "Friendly Teacher", icon: Heart, blurb: "Warm, patient, encouraging" },
  { id: "strict", name: "Strict Examiner", icon: Gavel, blurb: "Direct, demanding, precise" },
  { id: "coach", name: "Motivational Coach", icon: Flame, blurb: "High-energy, action-first" },
  { id: "specialist", name: "Subject Specialist", icon: GraduationCap, blurb: "Deep mechanism expert" },
  { id: "revision", name: "Revision Expert", icon: Repeat, blurb: "Mnemonics & recaps" },
  { id: "strategist", name: "Study Strategist", icon: Compass, blurb: "Time & priority planner" },
  { id: "critical", name: "Critical Thinker", icon: Brain, blurb: "Socratic questioning" },
  { id: "career", name: "Career Advisor", icon: Briefcase, blurb: "Subjects → futures" },
];

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher`;

function Mentors() {
  const { session } = useAuth();
  const [persona, setPersona] = useState("friendly");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const r = await fetch(FN, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ persona, messages: next }),
      });
      if (!r.ok || !r.body) throw new Error("Teacher unavailable");
      const reader = r.body.getReader(); const dec = new TextDecoder();
      let buf = "", acc = "", done = false;
      setMessages(m => [...m, { role: "assistant", content: "" }]);
      while (!done) {
        const { done: d, value } = await reader.read(); if (d) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const s = line.slice(6).trim();
          if (s === "[DONE]") { done = true; break; }
          try { const p = JSON.parse(s); const c = p.choices?.[0]?.delta?.content; if (c) { acc += c; setMessages(m => { const cp = [...m]; cp[cp.length - 1] = { role: "assistant", content: acc }; return cp; }); } } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-3xl font-semibold">AI Teacher Ecosystem</h1>
      <p className="text-sm text-muted-foreground">Pick a personality — switch any time.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {PERSONAS.map(p => {
          const Icon = p.icon; const active = persona === p.id;
          return (
            <button key={p.id} onClick={() => setPersona(p.id)} className={`rounded-xl border p-3 text-left transition ${active ? "border-falcon-gold bg-falcon-soft shadow-falcon" : "border-border bg-card hover:border-falcon-gold/40"}`}>
              <Icon className={`h-4 w-4 ${active ? "text-falcon-gold-deep" : "text-muted-foreground"}`} />
              <p className="mt-2 text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.blurb}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="h-[420px] space-y-3 overflow-y-auto pr-2">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Ask anything — the {PERSONAS.find(p => p.id === persona)?.name} is listening.</p>}
          {messages.map((m, i) => (
            <div key={i} className={`rounded-xl p-3 text-sm ${m.role === "user" ? "ml-auto max-w-[80%] bg-falcon-gold/15" : "max-w-[85%] bg-secondary"}`}>
              {m.role === "assistant" ? <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{m.content || "…"}</ReactMarkdown></div> : m.content}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a question…" />
          <Button onClick={send} disabled={busy}>Send</Button>
        </div>
      </div>
    </div>
  );
}import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Heart, Gavel, Flame, GraduationCap, Repeat, Brain, Compass, Briefcase } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mentors")({
  component: Mentors,
  head: () => ({ meta: [
    { title: "AI Teacher Ecosystem — 8 personalities | Sasha AI" },
    { name: "description", content: "Switch instantly between 8 AI teaching personalities — friendly mentor, strict examiner, coach, specialist, strategist and more." },
      { property: "og:title", content: "AI Teacher Ecosystem — 8 personalities | Sasha AI" },
      { property: "og:description", content: "Switch instantly between 8 AI teaching personalities — friendly mentor, strict examiner, coach, specialist, strategist and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

const PERSONAS = [
  { id: "friendly", name: "Friendly Teacher", icon: Heart, blurb: "Warm, patient, encouraging" },
  { id: "strict", name: "Strict Examiner", icon: Gavel, blurb: "Direct, demanding, precise" },
  { id: "coach", name: "Motivational Coach", icon: Flame, blurb: "High-energy, action-first" },
  { id: "specialist", name: "Subject Specialist", icon: GraduationCap, blurb: "Deep mechanism expert" },
  { id: "revision", name: "Revision Expert", icon: Repeat, blurb: "Mnemonics & recaps" },
  { id: "strategist", name: "Study Strategist", icon: Compass, blurb: "Time & priority planner" },
  { id: "critical", name: "Critical Thinker", icon: Brain, blurb: "Socratic questioning" },
  { id: "career", name: "Career Advisor", icon: Briefcase, blurb: "Subjects → futures" },
];

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher`;

function Mentors() {
  const { session } = useAuth();
  const [persona, setPersona] = useState("friendly");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const r = await fetch(FN, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ persona, messages: next }),
      });
      if (!r.ok || !r.body) throw new Error("Teacher unavailable");
      const reader = r.body.getReader(); const dec = new TextDecoder();
      let buf = "", acc = "", done = false;
      setMessages(m => [...m, { role: "assistant", content: "" }]);
      while (!done) {
        const { done: d, value } = await reader.read(); if (d) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const s = line.slice(6).trim();
          if (s === "[DONE]") { done = true; break; }
          try { const p = JSON.parse(s); const c = p.choices?.[0]?.delta?.content; if (c) { acc += c; setMessages(m => { const cp = [...m]; cp[cp.length - 1] = { role: "assistant", content: acc }; return cp; }); } } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-3xl font-semibold">AI Teacher Ecosystem</h1>
      <p className="text-sm text-muted-foreground">Pick a personality — switch any time.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {PERSONAS.map(p => {
          const Icon = p.icon; const active = persona === p.id;
          return (
            <button key={p.id} onClick={() => setPersona(p.id)} className={`rounded-xl border p-3 text-left transition ${active ? "border-falcon-gold bg-falcon-soft shadow-falcon" : "border-border bg-card hover:border-falcon-gold/40"}`}>
              <Icon className={`h-4 w-4 ${active ? "text-falcon-gold-deep" : "text-muted-foreground"}`} />
              <p className="mt-2 text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.blurb}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="h-[420px] space-y-3 overflow-y-auto pr-2">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Ask anything — the {PERSONAS.find(p => p.id === persona)?.name} is listening.</p>}
          {messages.map((m, i) => (
            <div key={i} className={`rounded-xl p-3 text-sm ${m.role === "user" ? "ml-auto max-w-[80%] bg-falcon-gold/15" : "max-w-[85%] bg-secondary"}`}>
              {m.role === "assistant" ? <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{m.content || "…"}</ReactMarkdown></div> : m.content}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a question…" />
          <Button onClick={send} disabled={busy}>Send</Button>
        </div>
      </div>
    </div>
  );
}
