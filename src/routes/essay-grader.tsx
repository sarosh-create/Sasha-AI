import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { PenLine, CheckCircle2, XCircle, Loader2, ScrollText } from "lucide-react";

export const Route = createFileRoute("/essay-grader")({
  head: () => ({
    meta: [
      { title: "Grade My Essay — free AI essay marker for your exam board | Sasha AI" },
      {
        name: "description",
        content:
          "Grade my essay: paste your essay and get strict board-specific marking, a point-by-point rubric, band descriptors and a recheck of marks you already received.",
      },
      { name: "keywords", content: "grade my essay, essay grader, AI essay marking, exam board essay feedback" },
      { property: "og:title", content: "Grade My Essay — free AI essay marker" },
      { property: "og:description", content: "Strict board-specific essay marking with a point-by-point rubric and recheck mode." },
      { property: "og:url", content: "https://sashaai.lovable.app/essay-grader" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Grade My Essay — free AI essay marker" },
      { name: "twitter:description", content: "Strict board-specific essay marking with a point-by-point rubric and recheck mode." },
    ],
    links: [{ rel: "canonical", href: "https://sashaai.lovable.app/essay-grader" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: "Sasha AI Essay Grader",
              url: "https://sashaai.lovable.app/essay-grader",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              description:
                "Free AI essay grader that marks essays strictly against exam-board criteria with a point-by-point rubric.",
            },
            {
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Can AI grade my essay accurately?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Sasha AI marks your essay against your exam board's own assessment objectives and band descriptors, showing exactly which marks were awarded and why.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Can I recheck a mark my teacher gave me?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. Switch to recheck mode, enter the mark you were given, and Sasha AI judges whether that mark was correct, too harsh or too generous.",
                  },
                },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: EssayGraderPage,
});

const BOARDS = [
  "Cambridge IGCSE",
  "Cambridge A-Level",
  "Edexcel IGCSE",
  "Edexcel A-Level",
  "AQA GCSE",
  "AQA A-Level",
  "OCR",
  "IB Diploma",
  "CBSE",
  "Other / school exam",
];

type Rubric = {
  criterion: string;
  awarded: number;
  available: number;
  descriptor?: string;
  evidence?: string;
  how_to_improve: string;
};
type Result = {
  total_awarded: number;
  total_available: number;
  grade_estimate?: string;
  band?: string;
  recheck_verdict?: string;
  rubric: Rubric[];
  strengths: string[];
  lost_marks: string[];
  rewritten_paragraph?: string;
  examiner_summary: string;
  next_steps: string[];
  trial?: boolean;
};

function EssayGraderPage() {
  const [mode, setMode] = useState<"grade" | "recheck">("grade");
  const [board, setBoard] = useState(BOARDS[0]);
  const [subject, setSubject] = useState("English Literature");
  const [level, setLevel] = useState("");
  const [question, setQuestion] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [claimed, setClaimed] = useState("");
  const [essay, setEssay] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const words = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  const submit = async () => {
    if (words < 30) {
      toast.error("Paste at least a paragraph of your essay.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/public/essay-grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          essay,
          mode,
          examBoard: board,
          subject,
          level,
          question,
          maxMarks: maxMarks ? Number(maxMarks) : undefined,
          claimed_marks: claimed ? Number(claimed) : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Marking failed");
      setResult(body as Result);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't mark that essay");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-aurora min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <Link to="/" aria-label="Sasha AI home">
          <Logo />
        </Link>
        <Button asChild size="sm">
          <Link to="/auth">Sign up free</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 pb-16">
        <section className="text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <PenLine className="h-3.5 w-3.5" /> Essay grader
          </div>
          <h1 className="font-display text-4xl font-bold text-gradient">Grade my essay</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Paste your essay and Sasha marks it exactly the way your exam board would — band by band, criterion by
            criterion — and shows every mark you won and lost. Already been marked? Switch to recheck.
          </p>
        </section>

        <section aria-labelledby="essay-inputs" className="rounded-2xl border bg-card p-6 shadow-pop">
          <h2 id="essay-inputs" className="mb-4 font-display text-xl font-bold">
            1. Your essay details
          </h2>

          <div className="mb-4 inline-flex rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setMode("grade")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "grade" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Mark it
            </button>
            <button
              type="button"
              onClick={() => setMode("recheck")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "recheck" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Recheck a mark
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="essay-board">Exam board</Label>
              <select
                id="essay-board"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {BOARDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="essay-subject">Subject</Label>
              <Input id="essay-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="essay-level">Level / paper (optional)</Label>
              <Input id="essay-level" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Paper 2, Higher tier…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="essay-max">Marks available (optional)</Label>
              <Input id="essay-max" inputMode="numeric" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} placeholder="30" />
            </div>
            {mode === "recheck" && (
              <div className="space-y-1.5">
                <Label htmlFor="essay-claimed">Mark you were given</Label>
                <Input id="essay-claimed" inputMode="numeric" value={claimed} onChange={(e) => setClaimed(e.target.value)} placeholder="18" />
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="essay-question">Essay question (optional but recommended)</Label>
              <Input
                id="essay-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="How does the writer present power in…"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="essay-text">Your essay</Label>
              <Textarea id="essay-text" rows={12} value={essay} onChange={(e) => setEssay(e.target.value)} placeholder="Paste your full essay here…" />
              <p className="text-xs text-muted-foreground">{words} words</p>
            </div>
          </div>

          <Button className="mt-4" onClick={submit} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Marking to the {board} criteria…
              </>
            ) : mode === "recheck" ? (
              "Recheck my mark"
            ) : (
              "Grade my essay"
            )}
          </Button>
        </section>

        {result && (
          <section aria-labelledby="essay-result" className="space-y-4">
            <h2 id="essay-result" className="font-display text-xl font-bold">
              2. Your marked essay
            </h2>

            <div className="rounded-2xl border bg-card p-6 shadow-pop">
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="font-display text-4xl font-bold">
                    {result.total_awarded}
                    <span className="text-lg text-muted-foreground">/{result.total_available}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Marks awarded</p>
                </div>
                {result.grade_estimate && (
                  <div>
                    <p className="font-display text-2xl font-semibold">{result.grade_estimate}</p>
                    <p className="text-xs text-muted-foreground">Grade estimate</p>
                  </div>
                )}
                {result.band && (
                  <div>
                    <p className="font-display text-2xl font-semibold">{result.band}</p>
                    <p className="text-xs text-muted-foreground">Band</p>
                  </div>
                )}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{result.examiner_summary}</p>
              {result.recheck_verdict && (
                <p className="mt-3 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm font-medium">
                  Recheck verdict: {result.recheck_verdict}
                </p>
              )}
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-pop">
              <h3 className="mb-3 font-display text-lg font-semibold">Point-by-point rubric</h3>
              <ul className="space-y-3">
                {result.rubric.map((r, i) => (
                  <li key={i} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{r.criterion}</p>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                        {r.awarded}/{r.available}
                      </span>
                    </div>
                    {r.descriptor && <p className="mt-1 text-xs text-muted-foreground">{r.descriptor}</p>}
                    {r.evidence && <p className="mt-1 text-xs italic text-muted-foreground">“{r.evidence}”</p>}
                    <p className="mt-2 text-sm">{r.how_to_improve}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-card p-6 shadow-pop">
                <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-success" /> What earned marks
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border bg-card p-6 shadow-pop">
                <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
                  <XCircle className="h-4 w-4 text-destructive" /> Where you lost marks
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.lost_marks.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {result.rewritten_paragraph && (
              <div className="rounded-2xl border bg-card p-6 shadow-pop">
                <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
                  <ScrollText className="h-4 w-4" /> A top-band rewrite of one paragraph
                </h3>
                <p className="text-sm text-muted-foreground">{result.rewritten_paragraph}</p>
              </div>
            )}

            <div className="rounded-2xl border bg-card p-6 shadow-pop">
              <h3 className="mb-2 font-display text-lg font-semibold">Do this next</h3>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {result.next_steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>

            {result.trial && (
              <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 text-center">
                <p className="text-sm font-medium">That was the free preview — sign up for full-length essays, saved marking history and your mistake journal.</p>
                <Button asChild className="mt-3">
                  <Link to="/auth">Create a free account</Link>
                </Button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
