import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { GradingDemo } from "@/components/grading-demo";
import {
  BrainCircuit,
  CalendarCheck,
  Flame,
  LineChart as LineChartIcon,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  Target,
} from "lucide-react";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sasha AI — Free AI study mentor & exam coach" },
      { name: "description", content: "Free AI study mentor: adaptive plans, AI tutor, strict exam-style quizzes, magical homework helper and a custom study buddy." },
      { property: "og:title", content: "Sasha AI — Free AI study mentor & exam coach" },
      { property: "og:description", content: "Adaptive plans, an AI tutor, strict-marked exam quizzes and a customisable study buddy. Free for students." },
      { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sasha AI — Free AI study mentor & exam coach" },
      { name: "twitter:description", content: "Adaptive plans, AI tutor, strict-marked exam quizzes, magical homework helper, custom study buddy." },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/" }],
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

      <main>

      <section className="bg-aurora">
        <div className="container mx-auto grid items-center gap-10 px-6 py-16 md:py-24 lg:grid-cols-2">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Built for students preparing for real exams
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Proof you're getting <span className="text-gradient">better</span> — not just busier.
            </h1>
            <p className="mt-5 text-base text-muted-foreground md:text-lg">
              Sasha AI marks your answers against the real mark scheme, re-teaches what you lost
              marks on, and plots a mastery curve per topic you can show a parent.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="shadow-glow">Start studying — it's free</Button>
              </Link>
              <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">
                How it works ↓
              </a>
            </div>
          </div>
          <div className="lg:pl-4">
            <GradingDemo />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Live demo of the tutor marking a 3-mark biology answer.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="container mx-auto grid gap-6 px-6 py-14 md:grid-cols-3">
          {[
            { icon: LineChartIcon, title: "A mastery curve per topic", text: "Every marked quiz becomes a datapoint. Two attempts and you can see the line move." },
            { icon: ShieldCheck, title: "Strict marking, not applause", text: "Marks are awarded the way an examiner would award them — including the ones you didn't get." },
            { icon: Target, title: "Weak spots drive the plan", text: "Lost marks feed straight back into tomorrow's roadmap, so the gap actually closes." },
          ].map((f) => (
            <div key={f.title} className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
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
              <h2 className="text-lg font-semibold">{f.title}</h2>
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

      </main>

      <footer className="container mx-auto flex items-center justify-between px-6 py-8 text-sm text-muted-foreground">

        <Logo size={22} />
        <span>© {new Date().getFullYear()} Sasha AI</span>
      </footer>
    </div>
  );
}
