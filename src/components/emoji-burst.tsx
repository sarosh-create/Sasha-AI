import { useEffect, useState } from "react";

type Burst = { id: number; emoji: string; x: number };

let _id = 0;
let _dispatch: ((b: Burst) => void) | null = null;

/** Fire an emoji burst from anywhere in the app. */
export function fireEmojiBurst(emoji: string) {
  if (!_dispatch) return;
  _dispatch({ id: ++_id, emoji, x: 30 + Math.random() * 40 });
}

/** Mount once at the root to render bursts. */
export function EmojiBurstLayer() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    _dispatch = (b) => {
      setBursts((prev) => [...prev, b]);
      setTimeout(() => setBursts((prev) => prev.filter((x) => x.id !== b.id)), 1400);
    };
    return () => { _dispatch = null; };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {bursts.map((b) => (
        <div
          key={b.id}
          className="absolute bottom-10 animate-emoji-rise text-5xl"
          style={{ left: `${b.x}%` }}
        >
          {b.emoji}
        </div>
      ))}
    </div>
  );
}
