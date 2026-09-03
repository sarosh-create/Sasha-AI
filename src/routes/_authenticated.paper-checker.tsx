import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PaperChecker, type MarkingResult } from "@/components/paper-checker";
import { aiHeaders } from "@/lib/fn-auth";
import { ScanLine } from "lucide-react";

export const Route = createFileRoute("/_authenticated/paper-checker")({
  head: () => ({
    meta: [
      { title: "Paper Checker & Rechecker — photo marking | Sasha AI" },
      { name: "description", content: "Photograph your handwritten answers and Sasha AI marks them exactly to your exam board's mark scheme — or rechecks marking you think was unfair." },
      { property: "og:title", content: "Paper Checker & Rechecker — photo marking | Sasha AI" },
      { property: "og:description", content: "Snap a photo of your paper and get board-accurate marks, missing keywords and a full-mark model answer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/paper-checker" }],
  }),
  component: PaperCheckerPage,
});

function PaperCheckerPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) { setReady(true); return; }
    supabase.from("profiles").select("exam_board").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.exam_board) setBoard(data.exam_board); setReady(true); });
  }, [user]);

  const saveMistakes = async (result: MarkingResult, meta: { subject: string }) => {
    if (!user) return;
    const rows = (result.questions ?? [])
      .filter((q) => q.marks_awarded < q.marks_available)
      .map((q) => ({
        user_id: user.id,
        topic: meta.subject,
        question: q.question_text ?? `Question ${q.number}`,
        student_answer: q.student_answer ?? null,
        correct_answer: q.model_answer,
        why_wrong: q.mark_points?.filter((p) => !p.awarded).map((p) => p.reason).join(" ") || null,
        marks_lost: Math.max(0, q.marks_available - q.marks_awarded),
      }));
    if (rows.length) await supabase.from("mistake_journal").insert(rows);
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Marking</p>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
          <ScanLine className="h-7 w-7 text-falcon-gold" /> Paper checker & rechecker
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Photograph your handwritten work. Sasha marks it exactly to your board's mark scheme — or rechecks marking you think was unfair. Every lost mark goes into your mistake journal.
        </p>
      </header>
      {ready && (
        <PaperChecker
          defaultBoard={board}
          getHeaders={aiHeaders}
          onResult={(r, m) => saveMistakes(r, m)}
        />
      )}
    </div>
  );
}
