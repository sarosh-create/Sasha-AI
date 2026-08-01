import { useEffect, useState } from "react";
import { CheckCircle2, PenLine, ShieldCheck } from "lucide-react";

/**
 * Landing-page proof: a looping, self-driving mock of the tutor marking a real
 * exam answer. No fake testimonials, no invented numbers — just the product
 * doing the thing it claims to do.
 */

const ANSWER =
  "Osmosis is when water moves from a dilute solution to a concentrated one through a membrane.";

const MARKS = [
  { label: "Water movement identified", awarded: true, note: "1/1 — correct direction of flow." },
  { label: "Partially permeable membrane", awarded: false, note: "0/1 — you wrote “membrane”. Examiners need “partially permeable”." },
  { label: "Water potential language", awarded: false, note: "0/1 — say “high to low water potential”, not “dilute to concentrated”." },
];

const STEPS = ["typing", "marking", "verdict"] as const;

export function GradingDemo() {
  const [step, setStep] = useState<(typeof STEPS)[number]>("typing");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let raf = 0;
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setStep("typing");
      setTyped("");
      i = 0;
      const type = () => {
        i += 2;
        setTyped(ANSWER.slice(0, i));
        if (i < ANSWER.length) {
          raf = window.setTimeout(type, 28);
        } else {
          timers.push(setTimeout(() => setStep("marking"), 500));
          timers.push(setTimeout(() => setStep("verdict"), 2600));
          timers.push(setTimeout(run, 7000));
        }
      };
      type();
    };
    run();
    return () => {
      clearTimeout(raf);
      timers.forEach(clearTimeout);
    };
  }, []);

  const marking = step !== "typing";

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning" />
        <span className="h-2.5 w-2.5 rounded-full bg-success" />
        <span className="ml-2 truncate text-xs text-muted-foreground">Biology · Osmosis · 3 marks</span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Question</p>
          <p className="mt-1 text-sm">Define osmosis. (3 marks)</p>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <PenLine className="h-3.5 w-3.5" /> Your answer
          </p>
          <p className="mt-1 min-h-[2.5rem] text-sm">
            {typed}
            {step === "typing" && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-foreground align-middle" />}
          </p>
        </div>

        <div
          className={`space-y-2 transition-all duration-500 ${marking ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"}`}
          aria-hidden={!marking}
        >
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Strict mark scheme
          </p>
          {MARKS.map((m, idx) => (
            <div
              key={m.label}
              className="flex items-start gap-2 rounded-xl border border-border bg-background p-2.5 transition-all"
              style={{ transitionDelay: `${idx * 220}ms`, opacity: marking ? 1 : 0 }}
            >
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 shrink-0 ${m.awarded ? "text-success" : "text-muted-foreground/50"}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.note}</p>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`flex items-center justify-between rounded-xl bg-secondary px-4 py-3 transition-all duration-500 ${
            step === "verdict" ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={step !== "verdict"}
        >
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">1 / 3 marks</p>
            <p className="truncate text-xs text-muted-foreground">Re-teaching “water potential” now — it'll come back tomorrow.</p>
          </div>
          <span className="shrink-0 rounded-full bg-warning px-2.5 py-1 text-xs font-semibold text-warning-foreground">
            Mastery 33%
          </span>
        </div>
      </div>
    </div>
  );
}
