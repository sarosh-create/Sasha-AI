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
  const wing = Math.sin(tick / 4) * (speaking ? 18 : 8);
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
          viewBox="0 0 200 200"
          width={compact ? 96 : 160}
          height={compact ? 96 : 160}
          style={{ transform: `translateY(${bob}px)`, transition: "transform 80ms linear", filter: speaking ? `drop-shadow(0 0 18px ${moodAccent}88)` : "none" }}
          aria-label="Falcon mascot"
        >
          {/* halo */}
          <circle cx="100" cy="100" r="84" fill={`${moodAccent}22`} />
          {/* tail */}
          <path d="M40 130 Q20 150 50 160 L70 140 Z" fill="#5b3a1d" />
          {/* body */}
          <ellipse cx="100" cy="120" rx="48" ry="42" fill="#8a5a30" />
          <ellipse cx="100" cy="128" rx="34" ry="28" fill="#d6b48a" />
          {/* left wing (flapping) */}
          <g style={{ transformOrigin: "70px 110px", transform: `rotate(${-wing}deg)`, transition: "transform 80ms linear" }}>
            <path d="M70 110 Q30 95 40 140 Q60 130 78 130 Z" fill="#6b4423" />
            <path d="M70 110 Q42 100 48 132 Q62 124 76 124 Z" fill="#8a5a30" />
          </g>
          {/* right wing */}
          <g style={{ transformOrigin: "130px 110px", transform: `rotate(${wing}deg)`, transition: "transform 80ms linear" }}>
            <path d="M130 110 Q170 95 160 140 Q140 130 122 130 Z" fill="#6b4423" />
            <path d="M130 110 Q158 100 152 132 Q138 124 124 124 Z" fill="#8a5a30" />
          </g>
          {/* head */}
          <g style={{ transformOrigin: "100px 80px", transform: `rotate(${Math.sin(tick / 18) * 3}deg)` }}>
            <ellipse cx="100" cy="78" rx="34" ry="32" fill="#6b4423" />
            {/* white face mask */}
            <path d="M75 80 Q100 110 125 80 Q120 60 100 58 Q80 60 75 80 Z" fill="#f5ecd9" />
            {/* eye markings — falcon malar stripe */}
            <path d="M86 88 Q90 102 95 110" stroke="#3b2410" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M114 88 Q110 102 105 110" stroke="#3b2410" strokeWidth="4" fill="none" strokeLinecap="round" />
            {/* eyes */}
            <ellipse cx="88" cy="78" rx="6" ry={6 * blink} fill="#1a1208" />
            <ellipse cx="112" cy="78" rx="6" ry={6 * blink} fill="#1a1208" />
            <circle cx="89.5" cy="76" r="1.5" fill="#fff" />
            <circle cx="113.5" cy="76" r="1.5" fill="#fff" />
            {/* beak — curved hooked falcon beak, animated open/close */}
            <defs>
              <linearGradient id="beakTop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd24a" />
                <stop offset="60%" stopColor="#f0a020" />
                <stop offset="100%" stopColor="#b86a00" />
              </linearGradient>
              <linearGradient id="beakBot" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e89400" />
                <stop offset="100%" stopColor="#7a4a00" />
              </linearGradient>
            </defs>
            {/* upper mandible — curved with hook */}
            <path
              d={`M92 94 Q100 92 108 94 Q110 99 106 ${100 + beakGap * 0.15} Q103 ${104 + beakGap * 0.4} 100 ${106 + beakGap * 0.5} Q97 ${104 + beakGap * 0.4} 94 ${100 + beakGap * 0.15} Q90 99 92 94 Z`}
              fill="url(#beakTop)"
              stroke="#5a3500"
              strokeWidth="0.6"
            />
            {/* nostril (cere) */}
            <circle cx="96.5" cy="96.2" r="0.9" fill="#3b2410" />
            {/* highlight on upper beak */}
            <path d="M95 95 Q100 93.5 105 95" stroke="#fff4c2" strokeWidth="0.8" fill="none" opacity="0.7" />
            {/* lower mandible — appears only when beak open */}
            {beakGap > 0.5 && (
              <path
                d={`M96 ${102 + beakGap * 0.15} Q100 ${103 + beakGap * 0.2} 104 ${102 + beakGap * 0.15} Q102 ${106 + beakGap} 100 ${107 + beakGap * 1.05} Q98 ${106 + beakGap} 96 ${102 + beakGap * 0.15} Z`}
                fill="url(#beakBot)"
                stroke="#4a2b00"
                strokeWidth="0.5"
              />
            )}
            {/* tongue hint when wide open */}
            {beakGap > 4 && (
              <ellipse cx="100" cy={104 + beakGap * 0.4} rx="1.6" ry={beakGap * 0.15} fill="#c44569" opacity="0.85" />
            )}
            {/* head crest */}
            <path d="M100 46 Q108 36 116 50 L100 56 Z" fill="#3b2410" />
          </g>
          {/* feet */}
          <path d="M88 158 L84 168 M92 158 L96 168" stroke="#c98a00" strokeWidth="3" strokeLinecap="round" />
          <path d="M108 158 L104 168 M112 158 L116 168" stroke="#c98a00" strokeWidth="3" strokeLinecap="round" />
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
