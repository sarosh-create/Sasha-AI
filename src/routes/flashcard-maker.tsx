import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Loader2, RotateCcw, Check, X } from "lucide-react";

const URL = "https://sashaai.lovable.app/flashcard-maker";

export const Route = createFileRoute("/flashcard-maker")({
  validateSearch: z.object({ deck: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Free AI Flashcard Maker — Sasha AI" },
      { name: "description", content: "Free AI flashcard maker: paste your notes or type a topic and get exam-ready flashcards in seconds. No sign-up needed." },
      { property: "og:title", content: "Free AI Flashcard Maker — Sasha AI" },
      { property: "og:description", content: "Turn notes or a topic into exam-focused flashcards instantly, then review them card by card." },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Sasha AI Flashcard Maker",
        url: URL,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      }),
    }],
  }),
  component: FlashcardMaker,
});

type Card = { front: string; back: string; known?: boolean };

function FlashcardMaker() {
  const { user } = useAuth();
  const { deck } = Route.useSearch();
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!deck || !user) return;
    supabase.from("generated_artifacts").select("id,title,payload").eq("id", deck).maybeSingle().then(({ data }) => {
      if (!data) return;
      const p = data.payload as { cards?: Card[] };
      setDeckId(data.id); setTitle(data.title); setCards(p.cards ?? []); setI(0); setFlipped(false);
    });
  }, [deck, user]);

  const generate = async () => {
    setBusy(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch("/api/public/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(s.session ? { Authorization: `Bearer ${s.session.access_token}` } : {}) },
        body: JSON.stringify({ topic, text, count: user ? 15 : 10 }),
      });
      const body = await res.json();
      if (!res.ok) { toast.error(body.error ?? "Something went wrong."); return; }
      setTitle(body.title); setCards(body.cards); setI(0); setFlipped(false); setDeckId(null);
      if (user) {
        const { data } = await supabase.from("generated_artifacts").insert({
          user_id: user.id, source_kind: "flashcard-maker", source_title: topic || null,
          artifact_kind: "flashcards", title: body.title, payload: { cards: body.cards },
        }).select("id").single();
        if (data) { setDeckId(data.id); toast.success("Deck saved to your dashboard."); }
      }
    } catch {
      toast.error("Couldn't reach Sasha — please try again.");
    } finally { setBusy(false); }
  };

  const mark = async (known: boolean) => {
    const next = cards.map((c, k) => (k === i ? { ...c, known } : c));
    setCards(next); setFlipped(false); setI((v) => Math.min(v + 1, next.length - 1));
    if (deckId && user) {
      await supabase.from("generated_artifacts").update({ payload: { cards: next, reviewed_at: new Date().toISOString() } }).eq("id", deckId);
    }
  };

  const knownCount = cards.filter((c) => c.known).length;
  const card = cards[i];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/"><Logo /></Link>
        {user ? <Link to="/my-dashboard"><Button size="sm" variant="outline">My dashboard</Button></Link>
          : <Link to="/auth"><Button size="sm">Sign up free</Button></Link>}
      </header>
      <main className="container mx-auto max-w-3xl px-6 pb-20">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Free AI flashcard maker</h1>
        <p className="mt-3 text-muted-foreground">Paste your notes or type a topic. Sasha makes exam-focused flashcards you can review card by card. No account needed{user ? "" : " — sign up to save decks and track them on your dashboard"}.</p>

        <section className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-xl font-semibold">Make a deck</h2>
          <div><Label htmlFor="fc-topic">Topic</Label><Input id="fc-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Photosynthesis (IGCSE Biology)" maxLength={120} /></div>
          <div><Label htmlFor="fc-notes">Notes (optional)</Label><Textarea id="fc-notes" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste class notes or a textbook section…" maxLength={user ? 20000 : 3000} /></div>
          <Button onClick={generate} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Make flashcards</Button>
        </section>

        {card && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">Card {i + 1} of {cards.length} · {knownCount} known</p>
            <button type="button" onClick={() => setFlipped((f) => !f)} aria-label="Flip card"
              className="mt-4 grid min-h-48 w-full place-items-center rounded-2xl border border-border bg-card p-8 text-center shadow-card transition hover:shadow-glow">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{flipped ? "Answer" : "Question"}</span>
              <span className="mt-2 text-lg font-medium">{flipped ? card.back : card.front}</span>
              <span className="mt-3 text-xs text-muted-foreground">Tap to flip</span>
            </button>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => mark(false)}><X className="mr-1 h-4 w-4" />Still learning</Button>
              <Button onClick={() => mark(true)}><Check className="mr-1 h-4 w-4" />I know it</Button>
              <Button variant="ghost" onClick={() => { setI(0); setFlipped(false); }}><RotateCcw className="mr-1 h-4 w-4" />Restart</Button>
            </div>
            {!user && (
              <div className="mt-6 rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-sm font-medium">Want to keep this deck?</p>
                <p className="mt-1 text-xs text-muted-foreground">Sign up free to save decks, track what you know and review from your dashboard.</p>
                <Link to="/auth"><Button size="sm" className="mt-3">Create a free account</Button></Link>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
