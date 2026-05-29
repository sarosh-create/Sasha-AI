import { Sparkles } from "lucide-react";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid place-items-center rounded-xl bg-primary text-primary-foreground"
        style={{ width: size, height: size }}
      >
        <Sparkles className="h-4 w-4" />
      </div>
      <span className="font-display text-lg font-semibold tracking-tight">
        Learn Kata <span className="text-accent">AI</span>
      </span>
    </div>
  );
}
