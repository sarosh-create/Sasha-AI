import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { Calculator, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/math-solver")({
  head: () => ({
    meta: [
      { title: "AI Math Solver — free step-by-step solutions | Sasha AI" },
      { name: "description", content: "Free AI math solver. Algebra, calculus, geometry, statistics and word problems — solved step-by-step with clear explanations." },
      { name: "keywords", content: "math solver, ai math solver, algebra solver, calculus solver, free math help, step by step math" },
      { property: "og:title", content: "AI Math Solver — free step-by-step solutions" },
      { property: "og:description", content: "Algebra, calculus, geometry and word problems solved step-by-step, free." },
      { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/math-solver" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "AI Math Solver — free step-by-step solutions" },
      { name: "twitter:description", content: "Algebra, calculus, geometry and word problems solved step-by-step, free." },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/math-solver" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Sasha AI Math Solver",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: "Free AI math solver with step-by-step solutions across algebra, calculus, geometry and statistics.",
      }),
    }],
  }),
  component: MathSolver,
});

function MathSolver() {
  const [q, setQ] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const solve = async () => {
    const question = q.trim();
    if (!question) return;
    setLoading(true); setOut("");
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          system: `You are an expert math tutor. Solve the problem step-by-step in clean markdown. Use plain math notation (write x^2, not LaTeX). Show every step. End with **Answer:** on its own line.`,
          messages: [{ role: "user", content: question }],
        }),
      });
      if (resp.status === 429) { toast.error("Too many requests."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok || !resp.body) { toast.error("Couldn't reach the solver."); return; }
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
            if (c) setOut((p) => p + c);
          } catch {}
        }
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm">Home</Button></Link>
          <Link to="/homework-helper"><Button variant="ghost" size="sm">Homework helper</Button></Link>
          <Link to="/auth"><Button size="sm">Sign in — free</Button></Link>
        </nav>
      </header>

      <main className="container mx-auto max-w-3xl px-6 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Free · Step-by-step · Every level
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            AI <span className="text-shimmer-gold">Math Solver</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
            Paste any problem — algebra, calculus, geometry, statistics, word problems. Get a clean, numbered solution in seconds.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="sr-only">Solve a problem</h2>
          <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Solve 2x² − 5x − 3 = 0, or find the derivative of sin(x)·e^x" className="min-h-[140px] resize-none text-base" maxLength={4000} />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{q.length}/4000</span>
            <Button onClick={solve} disabled={loading || !q.trim()} size="lg"><Calculator className="h-4 w-4" /> {loading ? "Solving…" : "Solve"}</Button>
          </div>
          {(out || loading) && (
            <article className="prose prose-sm mt-6 max-w-none rounded-xl border border-border bg-background/60 p-5 dark:prose-invert">
              {out ? <ReactMarkdown>{out}</ReactMarkdown> : <p className="text-muted-foreground">Thinking through the steps…</p>}
            </article>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">What this math solver covers</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>· Algebra, equations and inequalities</li>
            <li>· Calculus — limits, derivatives, integrals</li>
            <li>· Geometry and trigonometry</li>
            <li>· Statistics and probability</li>
            <li>· Word problems with full reasoning</li>
            <li>· Linear algebra basics</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
