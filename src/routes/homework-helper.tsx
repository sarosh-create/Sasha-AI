import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { Sparkles, BookOpen, Calculator, FlaskConical, Globe2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/homework-helper")({
  head: () => ({
    meta: [
      { title: "AI Homework Helper — Free step-by-step solutions | Sasha AI" },
      { name: "description", content: "Free AI homework helper. Paste any maths, science, English or history question and get instant step-by-step solutions. No sign up required." },
      { name: "keywords", content: "ai homework helper, homework helper, free homework help, math homework helper, online tutor, step by step solutions" },
      { property: "og:title", content: "AI Homework Helper — Free step-by-step solutions" },
      { property: "og:description", content: "Paste your homework question and get an instant, step-by-step solution from Sasha AI. Maths, science, English, more — all free." },
      { property: "og:url", content: "/homework-helper" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AI Homework Helper — Free step-by-step solutions" },
      { name: "twitter:description", content: "Paste your homework question and get an instant, step-by-step solution from Sasha AI." },
    ],
    links: [{ rel: "canonical", href: "/homework-helper" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to use the AI Homework Helper",
          description: "Get a step-by-step solution to any homework question in seconds.",
          step: [
            { "@type": "HowToStep", position: 1, name: "Paste your question", text: "Type or paste your homework question into the box." },
            { "@type": "HowToStep", position: 2, name: "Tap solve", text: "Click 'Solve step-by-step' and Sasha AI works through the problem." },
            { "@type": "HowToStep", position: 3, name: "Learn the method", text: "Read each numbered step so you understand the solution, not just the answer." },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "Is the AI Homework Helper free?", acceptedAnswer: { "@type": "Answer", text: "Yes. Sasha AI's homework helper is completely free with no usage limits for students." } },
            { "@type": "Question", name: "What subjects does it cover?", acceptedAnswer: { "@type": "Answer", text: "Maths, physics, chemistry, biology, English, history, geography, computer science and more." } },
            { "@type": "Question", name: "Do I need to sign up?", acceptedAnswer: { "@type": "Answer", text: "No account needed to try it. Sign up to save your solutions and build a personalised study plan." } },
            { "@type": "Question", name: "Does it just give the answer?", acceptedAnswer: { "@type": "Answer", text: "No — it shows the working step by step so you actually learn the method." } },
          ],
        }),
      },
    ],
  }),
  component: HomeworkHelper,
});

const EXAMPLES = [
  { icon: Calculator, label: "Solve 3x² − 7x + 2 = 0 using the quadratic formula." },
  { icon: FlaskConical, label: "Explain how photosynthesis converts light into glucose." },
  { icon: BookOpen, label: "Analyse the use of imagery in Robert Frost's 'The Road Not Taken'." },
  { icon: Globe2, label: "Why did the Treaty of Versailles lead to WWII? Give 3 reasons." },
];

function HomeworkHelper() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const solve = async () => {
    const question = q.trim();
    if (!question) return;
    if (question.length > 4000) {
      toast.error("Please keep questions under 4000 characters.");
      return;
    }
    setLoading(true);
    setAnswer("");
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            system:
              "You are an expert homework helper. Return a clear, numbered step-by-step solution in markdown. End with a one-line **Answer:** summary. Be concise but show the working — do not skip steps. If the question is unclear, ask one short clarifying question.",
            messages: [{ role: "user", content: question }],
          }),
        },
      );
      if (resp.status === 429) { toast.error("Too many requests. Please wait a moment."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted — please try again later."); return; }
      if (!resp.ok || !resp.body) { toast.error("Couldn't reach the AI helper."); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) setAnswer((prev) => prev + c);
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm">Home</Button></Link>
          <Link to="/auth"><Button size="sm">Sign in — free</Button></Link>
        </nav>
      </header>

      <main>
      <section className="container mx-auto px-6 pt-8 pb-12 md:pt-14">

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Free · No sign up required
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            AI Homework Helper
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
            Paste any homework question and get an instant, step-by-step solution. Maths, science, English, history — all explained clearly.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-card">
          <Textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Paste your homework question here…"
            className="min-h-[140px] resize-none text-base"
            maxLength={4000}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{q.length}/4000</span>
            <Button onClick={solve} disabled={loading || !q.trim()} size="lg">
              {loading ? "Solving…" : "Solve step-by-step"}
            </Button>
          </div>

          {!answer && !loading && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {EXAMPLES.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => setQ(label)}
                  className="flex items-start gap-2 rounded-lg border border-border bg-background/50 p-3 text-left text-sm transition hover:bg-accent"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          )}

          {(answer || loading) && (
            <article className="prose prose-sm mt-6 max-w-none rounded-xl border border-border bg-background/60 p-5 dark:prose-invert">
              {answer ? <ReactMarkdown>{answer}</ReactMarkdown> : <p className="text-muted-foreground">Thinking through the steps…</p>}
            </article>
          )}
        </div>
      </section>

      <section className="container mx-auto max-w-3xl px-6 pb-16">
        <h2 className="font-display text-2xl font-semibold">Frequently asked questions</h2>
        <div className="mt-5 space-y-4">
          <div><h3 className="font-medium">Is the AI Homework Helper free?</h3><p className="text-sm text-muted-foreground">Yes. Sasha AI's homework helper is completely free with no usage limits for students.</p></div>
          <div><h3 className="font-medium">What subjects does it cover?</h3><p className="text-sm text-muted-foreground">Maths, physics, chemistry, biology, English literature, history, geography, computer science and more.</p></div>
          <div><h3 className="font-medium">Do I need to sign up?</h3><p className="text-sm text-muted-foreground">No account is needed to try it. Sign up to save your solutions and unlock a personalised study plan.</p></div>
          <div><h3 className="font-medium">Does it just give the answer?</h3><p className="text-sm text-muted-foreground">No — every solution shows the working step by step so you actually learn the method, not just the result.</p></div>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <p className="font-display text-lg font-semibold">Want a full personalised study plan?</p>
          <p className="mt-1 text-sm text-muted-foreground">Sign up free to track progress, take adaptive quizzes and chat with Sasha AI any time.</p>
          <Link to="/auth"><Button className="mt-4" size="lg">Get started — free</Button></Link>
        </div>
      </section>
      </main>
    </div>
  );
}

