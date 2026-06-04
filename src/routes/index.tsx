import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import {
  BrainCircuit,
  CalendarCheck,
  Flame,
  MessageSquare,
  ScrollText,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sasha AI — Your personal AI study mentor" },
      { name: "description", content: "Personalized AI study plans, a tutor that teaches and tests you, strict-marked quizzes, and streak-based progress tracking. Free for students." },
      { property: "og:title", content: "Sasha AI" },
      { property: "og:description", content: "Your personal AI study mentor for focused exam prep." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">Get started — free</Button>
          </Link>
        </nav>
      </header>

      <section className="bg-aurora">
        <div className="container mx-auto px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Built for students preparing for real exams
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              The calm, focused way to <span className="text-gradient">actually learn</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Sasha AI builds a study roadmap around your weak spots, teaches like a real
              mentor, and grades you strictly so you walk into the exam ready.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="shadow-glow">Start studying — it's free</Button>
              </Link>
              <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">
                How it works ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="container mx-auto px-6 py-20">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Target, title: "Knows your weak spots", text: "Tell it your subjects and exam date. It builds a plan that spends more time where you're struggling." },
            { icon: MessageSquare, title: "AI tutor, not chatbot", text: "Teaches concepts step-by-step, checks understanding, and re-teaches whenever you slip." },
            { icon: ScrollText, title: "Strict-marked quizzes", text: "Exam-style questions graded honestly. No participation points — only what would actually count." },
            { icon: CalendarCheck, title: "Daily roadmap", text: "Wake up to today's plan: which topic, how long, what to practise next." },
            { icon: Flame, title: "Streaks that mean something", text: "Build a habit. Show up daily and watch your mastery curve climb." },
            { icon: BrainCircuit, title: "Adapts continuously", text: "Every mistake updates your plan. The AI shifts focus so you keep improving." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-glow">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="container mx-auto px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            Ready to study smarter?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Set up your subjects in 2 minutes. Your first study roadmap will be ready instantly.
          </p>
          <Link to="/auth" className="mt-6 inline-block">
            <Button size="lg" className="shadow-glow">Create my free account</Button>
          </Link>
        </div>
      </section>

      <footer className="container mx-auto flex items-center justify-between px-6 py-8 text-sm text-muted-foreground">
        <Logo size={22} />
        <span>© {new Date().getFullYear()} Sasha AI</span>
      </footer>
    </div>
  );
}
