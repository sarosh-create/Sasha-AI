import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wand2, FileText, Layers, Network, ListChecks, Sparkles, Sigma } from "lucide-react";

export const Route = createFileRoute("/_authenticated/converter")({
  component: Converter,
  head: () => ({ meta: [
    { title: "Universal Content Converter — Notes, flashcards, mindmaps | Sasha AI" },
    { name: "description", content: "Paste any text and instantly turn it into notes, flashcards, mindmaps, MCQs, summaries, or a formula sheet." },
  ] }),
});

const KINDS = [
  { id: "notes", label: "Detailed notes", icon: FileText },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "mindmap", label: "Mind map", icon: Network },
  { id: "mcqs", label: "MCQs", icon: ListChecks },
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "formula", label: "Formula sheet", icon: Sigma },
];

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-convert`;

function Converter() {
  const { user, session } = useAuth();
  const [text, setText] = useState("");
  const [kind, setKind] = useState("notes");
  const [title, setTitle] = useState("");
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (user) supabase.from("generated_artifacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8).then(({ data }) => setRecent(data ?? []));
  }, [user]);

  const run = async () => {
    if (text.trim().length < 30) { toast.error("Paste at least 30 characters."); return; }
    setBusy(true); setOut(null);
    try {
      const r = await fetch(FN, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ text, kind, title: title || "Untitled" }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Conversion failed");
      const j = await r.json();
      setOut(j);
      if (user) {
        await supabase.from("generated_artifacts").insert({
          user_id: user.id, source_kind: "text", artifact_kind: kind, title: title || "Untitled", payload: j.payload,
        });
        const { data } = await supabase.from("generated_artifacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8);
        setRecent(data ?? []);
      }
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center gap-3"><Wand2 className="h-6 w-6 text-falcon-gold-deep" /><h1 className="font-display text-3xl font-semibold">Universal Content Converter</h1></div>
      <p className="text-sm text-muted-foreground">Paste any source material and turn it into the study artifact you need.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cell respiration notes" /></div>
            <div>
              <Label>Output type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map(k => <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Source text</Label><Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste textbook section, notes, lecture transcript…" /></div>
          <Button size="lg" onClick={run} disabled={busy}><Wand2 className="mr-2 h-4 w-4" />{busy ? "Converting…" : "Convert"}</Button>

          {out?.payload && (
            <div className="mt-6 rounded-xl border border-border bg-background p-5 animate-fade-in">
              <ArtifactView kind={out.kind} payload={out.payload} />
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display text-lg font-semibold">Recent</h3>
          <ul className="mt-2 space-y-2">
            {recent.length === 0 && <li className="text-xs text-muted-foreground">Nothing yet.</li>}
            {recent.map(r => (
              <li key={r.id} className="rounded-lg border border-border/60 bg-background p-3 text-sm">
                <div className="flex items-center justify-between"><span className="font-medium">{r.title}</span><Badge variant="secondary" className="capitalize">{r.artifact_kind}</Badge></div>
                <button onClick={() => setOut({ kind: r.artifact_kind, payload: r.payload })} className="mt-1 text-xs text-falcon-gold-deep hover:underline">Open</button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function ArtifactView({ kind, payload }: { kind: string; payload: any }) {
  if (!payload) return null;
  if (kind === "notes") return (
    <div><h3 className="font-display text-xl font-semibold">{payload.title}</h3>
      {payload.sections?.map((s: any, i: number) => (
        <div key={i} className="mt-4"><h4 className="font-semibold">{s.heading}</h4><ul className="ml-5 list-disc text-sm">{s.bullets?.map((b: string, j: number) => <li key={j}>{b}</li>)}</ul></div>
      ))}
    </div>
  );
  if (kind === "flashcards") return (
    <div className="grid gap-3 sm:grid-cols-2">{payload.cards?.map((c: any, i: number) => (
      <div key={i} className="rounded-lg border border-border bg-card p-3"><p className="text-sm font-medium">{c.front}</p><p className="mt-1 text-xs text-muted-foreground">{c.back}</p></div>
    ))}</div>
  );
  if (kind === "mindmap") return (
    <div><p className="text-center font-display text-xl font-semibold">{payload.root}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{payload.branches?.map((b: any, i: number) => (
        <div key={i} className="rounded-lg bg-falcon-soft p-3"><p className="font-semibold text-falcon-navy">{b.label}</p><ul className="ml-4 list-disc text-sm text-falcon-navy/80">{b.children?.map((c: string, j: number) => <li key={j}>{c}</li>)}</ul></div>
      ))}</div></div>
  );
  if (kind === "mcqs") return (
    <ol className="space-y-3">{payload.items?.map((q: any, i: number) => (
      <li key={i} className="rounded-lg border border-border bg-card p-3"><p className="font-medium">{i + 1}. {q.question}</p><ul className="ml-5 mt-1 list-disc text-sm">{q.choices?.map((c: string, j: number) => <li key={j} className={c === q.correct ? "text-success" : ""}>{c}</li>)}</ul><p className="mt-2 text-xs text-muted-foreground">{q.why}</p></li>
    ))}</ol>
  );
  if (kind === "summary") return (
    <div><p className="font-medium">{payload.tldr}</p><ul className="ml-5 mt-3 list-disc text-sm">{payload.key_points?.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul></div>
  );
  if (kind === "formula") return (
    <div><h3 className="font-display text-lg font-semibold">{payload.topic}</h3><div className="mt-3 space-y-2">{payload.formulas?.map((f: any, i: number) => (
      <div key={i} className="rounded-lg border border-border bg-card p-3"><p className="font-semibold">{f.name}</p><p className="font-mono text-falcon-gold-deep">{f.expression}</p><p className="text-xs text-muted-foreground">{f.when_to_use}</p></div>
    ))}</div></div>
  );
  return <pre className="text-xs">{JSON.stringify(payload, null, 2)}</pre>;
}
