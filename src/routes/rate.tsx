import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { Star, Send, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/rate")({
  head: () => ({
    meta: [
      { title: "Rate & Suggest — help shape Sasha AI" },
      { name: "description", content: "Rate Sasha AI and share suggestions. Your feedback goes straight to the team and shapes upcoming features." },
      { property: "og:title", content: "Rate Sasha AI & share your suggestions" },
      { property: "og:description", content: "Give us a star rating, request a feature, or report a bug. We read everything." },
      { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/rate" },
      { name: "twitter:title", content: "Rate Sasha AI & share your suggestions" },
      { name: "twitter:description", content: "Star ratings, feature requests, bug reports — all welcome." },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/rate" }],
  }),
  component: RatePage,
});

function RatePage() {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState(user?.user_metadata?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (message.trim().length < 5) { toast.error("Please write a short message (5+ chars)"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user?.id ?? null,
      email: email.trim() || null,
      display_name: name.trim() || null,
      rating,
      category,
      message: message.trim().slice(0, 4000),
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
    toast.success("Thanks for your feedback!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Logo />
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Home</Button></Link>
      </header>

      <main className="container mx-auto max-w-2xl px-6 pb-16">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Rate Sasha AI & share suggestions</h1>
          <p className="mt-3 text-muted-foreground">Every star and message gets read. Tell us what's broken, what's brilliant, and what you wish existed.</p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <h2 className="font-display text-2xl">🎉 Thank you!</h2>
            <p className="mt-2 text-muted-foreground">Your feedback was recorded. We'll read it personally.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={() => { setDone(false); setMessage(""); setRating(5); }}>Submit another</Button>
              <Link to="/"><Button>Back home</Button></Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your rating</h2>
            <div className="mb-6 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className="rounded p-1 transition hover:scale-110"
                >
                  <Star className={`h-10 w-10 ${(hover || rating) >= n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rate-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name (optional)</label>
                <Input id="rate-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </div>
              <div>
                <label htmlFor="rate-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email (optional)</label>
                <Input id="rate-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
              </div>
            </div>

            <div className="mt-4">
              <h2 className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</h2>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General feedback</SelectItem>
                  <SelectItem value="feature">Feature request</SelectItem>
                  <SelectItem value="bug">Bug / issue</SelectItem>
                  <SelectItem value="praise">Praise 💛</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4">
              <label htmlFor="rate-message" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your message</label>
              <Textarea id="rate-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} placeholder="What do you love? What's missing? What's broken?" className="min-h-[140px]" />
              <p className="mt-1 text-xs text-muted-foreground">{message.length}/4000</p>
            </div>

            <Button onClick={submit} disabled={submitting} className="mt-5 w-full" size="lg">
              <Send className="mr-2 h-4 w-4" /> {submitting ? "Sending…" : "Submit feedback"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
