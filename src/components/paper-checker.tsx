import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, CheckCircle2, Loader2, RotateCcw, Stamp, XCircle } from "lucide-react";

export type MarkedQuestion = {
  number: string;
  question_text?: string;
  student_answer?: string;
  marks_awarded: number;
  marks_available: number;
  mark_points: { point: string; awarded: boolean; reason: string }[];
  missing_keywords: string[];
  model_answer: string;
  recheck_verdict?: string;
};

export type MarkingResult = {
  total_awarded: number;
  total_available: number;
  grade_estimate?: string;
  legibility_warning?: string;
  questions: MarkedQuestion[];
  examiner_summary: string;
  next_steps: string[];
  trial?: boolean;
};

export const BOARDS = [
  "Cambridge (CAIE) O Level",
  "Cambridge (CAIE) IGCSE",
  "Cambridge (CAIE) A Level",
  "Edexcel IGCSE",
  "Edexcel A Level",
  "AQA GCSE",
  "AQA A Level",
  "OCR",
  "IB Diploma",
  "Federal Board (Pakistan)",
  "CBSE (India)",
  "ICSE (India)",
  "SAT",
  "Other / general",
];

/** Downscale + compress a photo so uploads stay small and legible. */
export async function fileToCompressedDataUrl(file: File, max = 1500): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error("Could not read that file"));
    fr.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("bad image"));
      i.src = dataUrl;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale === 1 && dataUrl.length < 2_000_000) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return dataUrl;
  }
}

type Props = {
  /** Trial mode: 1 photo, max 2 questions, no sign-in required. */
  trial?: boolean;
  defaultBoard?: string;
  /** Extra auth headers for signed-in usage. */
  getHeaders?: () => Promise<Record<string, string>>;
  /** Called after a successful marking (e.g. to log a mistake journal entry). */
  onResult?: (result: MarkingResult, meta: { mode: "check" | "recheck"; subject: string; board: string }) => void;
  /** Rendered under the result in trial mode. */
  footer?: React.ReactNode;
  /** Return false to block a run (e.g. trial limit reached). */
  canRun?: () => boolean;
};

export function PaperChecker({ trial, defaultBoard, getHeaders, onResult, footer, canRun }: Props) {
  const [mode, setMode] = useState<"check" | "recheck">("check");
  const [images, setImages] = useState<string[]>([]);
  const [board, setBoard] = useState(defaultBoard || BOARDS[0]);
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [claimed, setClaimed] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MarkingResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const maxImages = trial ? 1 : 4;
  const idp = trial ? "trial-" : "";

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: string[] = [];
    for (const f of Array.from(files).slice(0, maxImages - images.length)) {
      if (!f.type.startsWith("image/")) continue;
      next.push(await fileToCompressedDataUrl(f));
    }
    if (!next.length) return toast.error("Please choose an image file.");
    setImages((cur) => [...cur, ...next].slice(0, maxImages));
  };

  const run = async () => {
    if (!images.length) return toast.error("Take or upload a photo of your work first.");
    if (canRun && !canRun()) return;
    setBusy(true);
    setResult(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json", ...(getHeaders ? await getHeaders() : {}) };
      const r = await fetch("/api/public/paper-check", {
        method: "POST",
        headers,
        body: JSON.stringify({
          images,
          mode,
          examBoard: board,
          subject: subject || "General",
          level,
          notes,
          claimed_marks: claimed ? Number(claimed) : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Marking failed");
      setResult(j as MarkingResult);
      onResult?.(j as MarkingResult, { mode, subject: subject || "General", board });
    } catch (e: any) {
      toast.error(e.message ?? "Marking failed");
    } finally {
      setBusy(false);
    }
  };

  const pct = result && result.total_available > 0 ? Math.round((result.total_awarded / result.total_available) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("check")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "check" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Check my paper
          </button>
          <button
            type="button"
            onClick={() => setMode("recheck")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "recheck" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Recheck a marked paper
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${idp}pc-board`}>Exam board</Label>
            <select
              id={`${idp}pc-board`}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
            >
              {BOARDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`${idp}pc-subject`}>Subject</Label>
            <Input id={`${idp}pc-subject`} className="mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Biology" />
          </div>
          {!trial && (
            <>
              <div>
                <Label htmlFor={`${idp}pc-level`}>Level / grade</Label>
                <Input id={`${idp}pc-level`} className="mt-1" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="O Level, Grade 11…" />
              </div>
              {mode === "recheck" && (
                <div>
                  <Label htmlFor={`${idp}pc-claimed`}>Marks you were given</Label>
                  <Input id={`${idp}pc-claimed`} className="mt-1" type="number" value={claimed} onChange={(e) => setClaimed(e.target.value)} placeholder="4" />
                </div>
              )}
              <div className="sm:col-span-2">
                <Label htmlFor={`${idp}pc-notes`}>Anything the examiner should know (optional)</Label>
                <Textarea id={`${idp}pc-notes`} className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Question 3 was a 6-marker on osmosis…" />
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <Label htmlFor={`${idp}pc-file`}>
            Photo of your work {trial ? "(1 page)" : `(up to ${maxImages} pages)`}
          </Label>
          <input
            id={`${idp}pc-file`}
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple={!trial}
            className="sr-only"
            onChange={(e) => pick(e.target.files)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={images.length >= maxImages}>
              <Camera className="h-4 w-4" /> {images.length ? "Add another page" : "Take / upload photo"}
            </Button>
            {images.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt={`Uploaded answer page ${i + 1}`} className="h-20 w-16 rounded-lg border border-border object-cover" />
                <button
                  type="button"
                  aria-label={`Remove page ${i + 1}`}
                  onClick={() => setImages((cur) => cur.filter((_, x) => x !== i))}
                  className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-xs text-destructive-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <Button className="mt-4 w-full sm:w-auto" onClick={run} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
          {busy ? "Marking against the mark scheme…" : mode === "check" ? "Mark my paper" : "Recheck this marking"}
        </Button>
        {trial && <p className="mt-2 text-xs text-muted-foreground">Free trial: 2 questions, no account needed.</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-falcon-gold/40 bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="font-display text-3xl font-semibold">
                  {result.total_awarded}/{result.total_available}
                </p>
                <p className="text-xs text-muted-foreground">{pct}% · {board}</p>
              </div>
              {result.grade_estimate && <Badge variant="secondary">Estimated: {result.grade_estimate}</Badge>}
              {mode === "recheck" && <Badge variant="outline"><RotateCcw className="mr-1 h-3 w-3" /> Recheck</Badge>}
            </div>
            {result.legibility_warning && (
              <p className="mt-3 rounded-lg bg-warning/10 p-2 text-xs text-muted-foreground">{result.legibility_warning}</p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">{result.examiner_summary}</p>
          </div>

          {result.questions?.map((q, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">Question {q.number}</p>
                <Badge variant={q.marks_awarded === q.marks_available ? "default" : "secondary"}>
                  {q.marks_awarded}/{q.marks_available}
                </Badge>
              </div>
              {q.question_text && <p className="mt-1 text-sm text-muted-foreground">{q.question_text}</p>}
              {q.recheck_verdict && <p className="mt-2 text-sm font-medium">{q.recheck_verdict}</p>}
              <ul className="mt-3 space-y-1.5 text-sm">
                {q.mark_points?.map((p, j) => (
                  <li key={j} className="flex gap-2">
                    {p.awarded ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span>
                      <span className="font-medium">{p.point}</span>
                      <span className="text-muted-foreground"> — {p.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {!!q.missing_keywords?.length && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Missing examiner keywords: <span className="font-medium text-foreground">{q.missing_keywords.join(", ")}</span>
                </p>
              )}
              {q.model_answer && (
                <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full-mark answer</p>
                  <p className="mt-1">{q.model_answer}</p>
                </div>
              )}
            </div>
          ))}

          {!!result.next_steps?.length && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="font-semibold">What to fix next</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {result.next_steps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {footer}
        </div>
      )}
    </div>
  );
}
