import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GraduationCap, Trophy } from "lucide-react";
import { aiHeaders } from "@/lib/fn-auth";

export const Route = createFileRoute("/_authenticated/teach")({
  component: Teach,
  head: () => ({ meta: [
    { title: "Teach-to-Learn — Teach the AI to master it | Sasha AI" },
    { name: "description", content: "Teach the AI a topic. It plays a curious student, asks harder and harder questions, and confirms when you've mastered it." },
      { property: "og:title", content: "Teach-to-Learn — Teach the AI to master it | Sasha AI" },
      { property: "og:description", content: "Teach the AI a topic. It plays a curious student, asks harder and harder questions, and confirms when you've mastered it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
  ],
    links: [{ rel: "canonical", href: "https://sashaai.lovable.app/teach" }] }),
});

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teach-back`;

function Teach() {
  const { session } = useAuth();
  const [topic, setTopic] = useState("");
  const [round, setRound] = useState(1);
  const [transcript, setTranscript] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mastered, setMastered] = useState(false);

  const send = async () => {
    if (!topic.trim() || !input.trim() || busy) return;
    const next = [...transcript, { role: "user" as const, content: input.trim() }];
    setTranscript(next); setInput(""); setBusy(true);
    try {
      const r = await fetch(FN, {
        method: "POST",
        headers: await aiHeaders(),
        body: JSON.stringify({ topic, transcript: next, round }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      const j = await r.json();
      setTranscript([...next, { role: "assistant", content: j.reply }]);
      setMastered(j.mastered);
      if (!j.mastered) setRound(round + 1);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const reset = () => { setTranscript([]); setRound(1); setMastered(false); };

  return (
    <div className="container mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-3"><GraduationCap className="h-6 w-6 text-falcon-gold-deep" /><h1 className="font-display text-3xl font-semibold">Teach-to-Learn</h1></div>
      <p className="text-sm text-muted-foreground">You teach. The AI plays student. It tests until you've mastered it.</p>

      <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-card">
        <Label>Topic you'll teach</Label>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} disabled={transcript.length > 0} placeholder="e.g. Photosynthesis light-dependent reactions" />
        {transcript.length > 0 && <Badge className="mt-2 bg-falcon-gold/15 text-falcon-gold-deep">Round {round}</Badge>}

        <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto">
          {transcript.length === 0 && <p className="text-sm text-muted-foreground">Pick a topic, then write your first explanation below.</p>}
          {transcript.map((m, i) => (
            <div key={i} className={`rounded-xl p-3 text-sm ${m.role === "user" ? "ml-auto max-w-[80%] bg-falcon-gold/15" : "max-w-[85%] bg-secondary"}`}>
              {m.role === "assistant" && <p className="mb-1 text-xs font-medium text-muted-foreground">Curious student</p>}
              {m.content}
            </div>
          ))}
          {mastered && (
            <div className="rounded-xl border-2 border-falcon-gold bg-falcon-soft p-4 text-falcon-navy">
              <div className="flex items-center gap-2 font-display font-semibold"><Trophy className="h-5 w-5" /> Mastered!</div>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={transcript.length === 0 ? "Start your explanation…" : "Answer the student's question…"} rows={4} />
          <div className="flex gap-2">
            <Button onClick={send} disabled={busy || mastered || !topic.trim()}>{busy ? "Thinking…" : transcript.length === 0 ? "Start teaching" : "Send"}</Button>
            {transcript.length > 0 && <Button variant="outline" onClick={reset}>Reset</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
