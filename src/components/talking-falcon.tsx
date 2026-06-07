import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mood = "idle" | "happy" | "thinking" | "alert";

type Props = {
  name?: string | null;
  lines?: string[];           // rotating bestie messages
  autoSpeak?: boolean;        // speak first line on mount
  mood?: Mood;
  compact?: boolean;
};

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-falcon`;

/**
 * Animated SVG falcon mascot that talks to the student like a bestie.
 * - Wings flap, head bobs, eyes blink
 * - Beak opens & closes while audio is playing (driven by Web Audio analyser)
 * - Voice via ElevenLabs edge function (tts-falcon)
 */
export function TalkingFalcon({ name, lines, autoSpeak = false, mood = "idle", compact = false }: Props) {
  const defaults = [
    `Yo ${name ?? "champ"} — your falcon's locked in. Let's hunt some questions today.`,
    `I scanned your weak spots overnight. Tap a lesson and I'll guide you wing-to-wing.`,
    `Streak alive, mind sharp. One focused block beats three lazy ones — let's go.`,
    `Your exam isn't a monster — it's a pattern. I see it. Trust me, you'll see it too.`,
  ];
  const messages = lines && lines.length ? lines : defaults;
  const [idx, setIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [beakOpen, setBeakOpen] = useState(0); // 0..1
  const [tick, setTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // gentle idle animation tick
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(i);
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setSpeaking(false);
    setBeakOpen(0);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (muted) return;
    stop();
    try {
      const resp = await fetch(TTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx: AudioContext = ctxRef.current ?? new Ctx();
        ctxRef.current = ctx;
        const src = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 2; i < 20; i++) sum += data[i];
          const v = Math.min(1, sum / (18 * 180));
          setBeakOpen(v);
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch {
        // analyser failed (e.g. CORS) — still play audio with fake mouth
        const i = setInterval(() => setBeakOpen(Math.random() * 0.8 + 0.1), 100);
        audio.onended = () => clearInterval(i);
      }

      audio.onended = () => stop();
      setSpeaking(true);
      await audio.play();
    } catch {
      /* ignore */
    }
  }, [muted, stop]);

  useEffect(() => {
    if (autoSpeak) speak(messages[0]);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    const n = (idx + 1) % messages.length;
    setIdx(n);
    speak(messages[n]);
  };

  // computed animation values
  const bob = Math.sin(tick / 8) * 3;
  
  const blink = tick % 60 < 3 ? 0.1 : 1;
  const beakGap = beakOpen * 9;

  const moodAccent =
    mood === "alert" ? "#f59e0b" :
    mood === "thinking" ? "#60a5fa" :
    mood === "happy" ? "#22c55e" : "#a78bfa";

  return (
    <div className={`flex ${compact ? "flex-row items-center gap-3" : "flex-col items-center gap-3"}`}>
      <div className="relative">
        <svg
          viewBox="0 0 240 200"
          width={compact ? 110 : 180}
          height={compact ? 96 : 160}
          style={{ transform: `translateY(${bob}px)`, transition: "transform 80ms linear", filter: speaking ? `drop-shadow(0 0 18px ${moodAccent}aa)` : "drop-shadow(0 4px 6px rgba(0,0,0,0.25))" }}
          aria-label="Falcon mascot"
        >
          <defs>
            <linearGradient id="beakTop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff27a" />
              <stop offset="55%" stopColor="#ffd11a" />
              <stop offset="100%" stopColor="#d99500" />
            </linearGradient>
            <linearGradient id="beakBot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8a000" />
              <stop offset="100%" stopColor="#8a5500" />
            </linearGradient>
            <linearGradient id="feathersDark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6b4423" />
              <stop offset="100%" stopColor="#3b2410" />
            </linearGradient>
            <linearGradient id="feathersMid" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8a5a30" />
              <stop offset="100%" stopColor="#5b3a1d" />
            </linearGradient>
          </defs>

          {/* halo */}
          <circle cx="120" cy="100" r="92" fill={`${moodAccent}1f`} />

          {/* head group — side profile mascot, facing left */}
          <g style={{ transformOrigin: "120px 100px", transform: `rotate(${Math.sin(tick / 18) * 2.5}deg)` }}>
            {/* back feather spikes (dark, layered) */}
            <path
              d="M170 70 L210 50 L195 78 L225 70 L205 95 L230 100 L208 115 L228 130 L200 130 L218 158 L188 138 L195 168 L170 145 L165 175 L150 148 L140 178 L138 150 Z"
              fill="url(#feathersDark)"
              stroke="#1a0f06"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* mid feather layer */}
            <path
              d="M160 78 L195 68 L182 92 L210 92 L190 110 L212 120 L188 125 L205 148 L178 132 L185 158 L162 138 L155 162 L148 138 Z"
              fill="url(#feathersMid)"
              stroke="#1a0f06"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* main head shape (brown crown) */}
            <path
              d="M75 100 Q72 70 102 60 Q140 52 168 78 Q178 92 172 118 Q165 140 145 148 Q120 154 100 144 Q78 132 75 100 Z"
              fill="#6b4423"
              stroke="#1a0f06"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* white face mask — wraps from forehead down across cheek */}
            <path
              d="M78 102 Q76 86 92 78 Q108 72 124 78 L150 92 Q145 118 130 132 Q110 142 92 138 Q78 130 78 102 Z"
              fill="#f5ecd9"
              stroke="#1a0f06"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {/* grey shadow accent on cheek */}
            <path
              d="M118 100 Q140 100 148 118 Q138 132 120 132 Q108 128 110 116 Z"
              fill="#bfb6a3"
              opacity="0.7"
            />

            {/* white forehead stripe */}
            <path
              d="M96 70 Q120 60 148 72 Q140 80 122 78 Q108 78 96 82 Z"
              fill="#ffffff"
              stroke="#1a0f06"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* angry eyebrow */}
            <path
              d="M92 86 Q108 80 128 90"
              stroke="#1a0f06"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />

            {/* eye — sharp, fierce */}
            <g>
              <ellipse cx="112" cy="98" rx="9" ry={9 * blink} fill="#ffffff" stroke="#1a0f06" strokeWidth="2.2" />
              <ellipse cx="114" cy="99" rx="5.5" ry={5.5 * blink} fill="#1a0f06" />
              <circle cx="116" cy="97" r="1.6" fill="#ffffff" />
            </g>

            {/* malar stripe (falcon tear mark) */}
            <path
              d="M108 108 Q104 122 96 132"
              stroke="#1a0f06"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />

            {/* upper beak — big bold hooked yellow beak */}
            <path
              d={`M82 102
                  Q60 ${104 - beakGap * 0.2} 38 ${112 - beakGap * 0.3}
                  Q30 ${116 - beakGap * 0.2} 36 ${122 - beakGap * 0.15}
                  Q48 ${122 - beakGap * 0.1} 58 ${120 - beakGap * 0.05}
                  Q72 ${118 - beakGap * 0.05} 88 ${114 - beakGap * 0.02}
                  Z`}
              fill="url(#beakTop)"
              stroke="#1a0f06"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            {/* beak inner line / highlight */}
            <path
              d={`M48 ${118 - beakGap * 0.1} Q66 ${116 - beakGap * 0.05} 84 ${112 - beakGap * 0.02}`}
              stroke="#a06800"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              opacity="0.7"
            />
            {/* nostril */}
            <ellipse cx="74" cy={108 - beakGap * 0.05} rx="2.2" ry="1.6" fill="#1a0f06" />

            {/* lower beak — appears when open */}
            {beakGap > 0.3 && (
              <path
                d={`M82 ${114 + beakGap * 0.05}
                    Q66 ${120 + beakGap * 0.4} 50 ${124 + beakGap * 0.7}
                    Q44 ${126 + beakGap * 0.9} 52 ${130 + beakGap * 1.1}
                    Q68 ${128 + beakGap * 0.9} 84 ${122 + beakGap * 0.5}
                    Z`}
                fill="url(#beakBot)"
                stroke="#1a0f06"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            )}
            {/* tongue */}
            {beakGap > 3.5 && (
              <ellipse cx={62} cy={124 + beakGap * 0.6} rx={beakGap * 0.6} ry={beakGap * 0.22} fill="#c44569" opacity="0.9" />
            )}

            {/* small wing tuft suggestion bottom-left */}
            <path d="M88 142 Q92 152 100 150 Q96 144 90 142 Z" fill="#3b2410" />
          </g>
        </svg>
        {speaking && (
          <span className="absolute -right-1 -top-1 inline-flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: moodAccent }} />
            <span className="relative inline-flex h-3 w-3 rounded-full" style={{ background: moodAccent }} />
          </span>
        )}
      </div>

      <div className={`${compact ? "" : "w-full max-w-sm"} rounded-2xl border border-border bg-background/80 px-4 py-3 backdrop-blur`}>
        <p className="text-sm font-medium leading-snug">{messages[idx]}</p>
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={next} className="gap-1">
            <Sparkles className="h-3.5 w-3.5" /> {speaking ? "Speaking…" : "Tell me more"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setMuted((m) => !m); if (!muted) stop(); }} aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
