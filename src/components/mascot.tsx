import { useEffect, useState } from "react";
import falconLogo from "@/assets/falcon-logo.png";

const LINES = {
  idle: [
    "Ready when you are. Pick a lesson and let's go.",
    "Small steps, big results. What shall we tackle?",
    "Tip: start with your weakest subject first.",
  ],
  cheer: ["Yes! Nailed it 💜", "Beautiful — that's exactly right.", "You're on fire today!"],
  nudge: ["Close — let's revisit the idea.", "Don't worry, mistakes teach us.", "Try again. Read it slowly this time."],
  streak: ["Streak protected. Keep showing up!", "Consistency beats intensity. Proud of you."],
  think: ["Hmm, let me think about that…", "Looking that up for you.", "One sec — checking my notes."],
  oops: ["Oops! That step doesn't fit yet.", "Almost — try a different piece of kit.", "No worries, undo and try again."],
};

export type MascotMood = keyof typeof LINES;

export function Mascot({ mood = "idle", message }: { mood?: MascotMood; message?: string }) {
  const [line, setLine] = useState("");
  useEffect(() => {
    if (message) { setLine(message); return; }
    const pool = LINES[mood];
    setLine(pool[Math.floor(Math.random() * pool.length)]);
  }, [mood, message]);

  const anim =
    mood === "cheer" ? "animate-bounce" :
    mood === "oops" ? "animate-wiggle" :
    mood === "think" ? "animate-bob" : "";

  return (
    <div className="flex items-end gap-3">
      <img
        src={falconLogo}
        alt="Sasha AI falcon mascot"
        width={72}
        height={72}
        className={`h-[72px] w-[72px] shrink-0 drop-shadow-md ${anim}`}
      />
      <div className="relative max-w-[220px] rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-sm shadow-card">
        {line}
      </div>
    </div>
  );
}

