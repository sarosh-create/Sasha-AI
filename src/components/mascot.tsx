import { useEffect, useState } from "react";

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

  return (
    <div className="flex items-end gap-3">
      <KataOwl mood={mood} />
      <div className="relative max-w-[220px] rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-sm shadow-card">
        {line}
      </div>
    </div>
  );
}

function KataOwl({ mood }: { mood: MascotMood }) {
  const anim =
    mood === "cheer" ? "animate-bounce" :
    mood === "oops" ? "animate-wiggle" :
    mood === "think" ? "animate-bob" : "";
  return (
    <svg
      width="72" height="72" viewBox="0 0 72 72" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-md ${anim}`}
      aria-label="Kata the study owl"
    >
      <defs>
        <linearGradient id="kataBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <ellipse cx="36" cy="42" rx="24" ry="26" fill="url(#kataBody)" />
      <ellipse cx="36" cy="48" rx="14" ry="16" fill="#f5f0ff" />
      <path d="M14 22 L20 12 L24 22 Z" fill="#7c3aed" />
      <path d="M58 22 L52 12 L48 22 Z" fill="#7c3aed" />
      <circle cx="26" cy="34" r="8" fill="white" />
      <circle cx="46" cy="34" r="8" fill="white" />
      <circle cx="27" cy={mood === "nudge" || mood === "oops" ? 36 : 35} r="3.5" fill="#0f1b3d" />
      <circle cx="47" cy={mood === "nudge" || mood === "oops" ? 36 : 35} r="3.5" fill="#0f1b3d" />
      <circle cx="28" cy="34" r="1" fill="white" />
      <circle cx="48" cy="34" r="1" fill="white" />
      <path d={mood === "cheer" ? "M30 44 Q36 50 42 44" : "M33 42 L39 42 L36 48 Z"} stroke="#f59e0b" strokeWidth={mood === "cheer" ? 2 : 0} fill={mood === "cheer" ? "none" : "#f59e0b"} strokeLinecap="round" />
      <path d="M28 66 l-2 4 M32 66 l0 4 M44 66 l-2 4 M40 66 l0 4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
