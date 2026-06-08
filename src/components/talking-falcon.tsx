import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mood = "idle" | "happy" | "thinking" | "alert";
export type FalconTheme = "slate" | "desert" | "midnight" | "arctic" | "ember";

export type FalconCustomization = {
  theme?: FalconTheme;
  eyeGlow?: number;       // 0..1
  featherDetail?: number; // 0..1
};

type Props = {
  name?: string | null;
  lines?: string[];
  autoSpeak?: boolean;
  mood?: Mood;
  compact?: boolean;
} & FalconCustomization;

const THEMES: Record<FalconTheme, { hood1: string; hood2: string; hood3: string; back1: string; back2: string; cheek1: string; cheek2: string; eyeRing: string; }> = {
  slate:    { hood1: "#4a5566", hood2: "#2f3845", hood3: "#1b2230", back1: "#5d6b7d", back2: "#33404f", cheek1: "#fbf6ea", cheek2: "#d9d2bf", eyeRing: "#f0b820" },
  desert:   { hood1: "#a8835a", hood2: "#7d5a36", hood3: "#4b341b", back1: "#bf9468", back2: "#7d5a36", cheek1: "#fff4d6", cheek2: "#e6cfa0", eyeRing: "#ffb020" },
  midnight: { hood1: "#3b3f6e", hood2: "#23264a", hood3: "#0f1226", back1: "#4a4f80", back2: "#23264a", cheek1: "#e8e6ff", cheek2: "#b8b6e0", eyeRing: "#7c9cff" },
  arctic:   { hood1: "#cfd8e3", hood2: "#9aa6b4", hood3: "#5d6772", back1: "#dbe3ec", back2: "#9aa6b4", cheek1: "#ffffff", cheek2: "#e1e6ec", eyeRing: "#ffcf30" },
  ember:    { hood1: "#6b2a1f", hood2: "#3e150e", hood3: "#1c0703", back1: "#8a3a26", back2: "#3e150e", cheek1: "#ffe6d0", cheek2: "#e0b48a", eyeRing: "#ff7a1a" },
};

export function readFalconCustomization(): FalconCustomization {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("sasha:falcon");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
export function saveFalconCustomization(c: FalconCustomization) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sasha:falcon", JSON.stringify(c));
  window.dispatchEvent(new Event("sasha:falcon-change"));
}

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-falcon`;

/**
 * Animated SVG falcon mascot that talks to the student like a bestie.
 * - Wings flap, head bobs, eyes blink
 * - Beak opens & closes while audio is playing (driven by Web Audio analyser)
 * - Voice via ElevenLabs edge function (tts-falcon)
 */
export function TalkingFalcon({ name, lines, autoSpeak = false, mood = "idle", compact = false, theme, eyeGlow, featherDetail }: Props) {
  const [custom, setCustom] = useState<FalconCustomization>(() => readFalconCustomization());
  useEffect(() => {
    const onChange = () => setCustom(readFalconCustomization());
    window.addEventListener("sasha:falcon-change", onChange);
    return () => window.removeEventListener("sasha:falcon-change", onChange);
  }, []);
  const activeTheme: FalconTheme = theme ?? (custom.theme ?? "slate");
  const glow = eyeGlow ?? custom.eyeGlow ?? 0.5;
  const detail = featherDetail ?? custom.featherDetail ?? 0.6;
  const T = THEMES[activeTheme];
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
          style={{ transform: `translateY(${bob}px)`, transition: "transform 80ms linear", filter: speaking ? `drop-shadow(0 0 ${12 + glow * 18}px ${T.eyeRing}cc)` : `drop-shadow(0 3px 5px rgba(0,0,0,0.28)) drop-shadow(0 0 ${glow * 10}px ${T.eyeRing}66)` }}
          aria-label="Falcon mascot"
        >
          <defs>
            <linearGradient id="hoodGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.hood1} />
              <stop offset="60%" stopColor={T.hood2} />
              <stop offset="100%" stopColor={T.hood3} />
            </linearGradient>
            <linearGradient id="backGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={T.back1} />
              <stop offset="100%" stopColor={T.back2} />
            </linearGradient>
            <linearGradient id="throatGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.cheek1} />
              <stop offset="100%" stopColor={T.cheek2} />
            </linearGradient>
            <linearGradient id="beakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a4f58" />
              <stop offset="70%" stopColor="#23272e" />
              <stop offset="100%" stopColor="#0d1116" />
            </linearGradient>
            <linearGradient id="cereGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd23a" />
              <stop offset="100%" stopColor="#caa000" />
            </linearGradient>
            <radialGradient id="eyeGrad" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#3a2410" />
              <stop offset="70%" stopColor="#100806" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <radialGradient id="eyeGlowGrad" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor={T.eyeRing} stopOpacity={glow} />
              <stop offset="100%" stopColor={T.eyeRing} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* soft halo */}
          <circle cx="120" cy="100" r="92" fill={`${moodAccent}14`} />

          {/* head group — realistic peregrine, facing left */}
          <g style={{ transformOrigin: "120px 100px", transform: `rotate(${Math.sin(tick / 22) * 1.6}deg)` }}>

            {/* back of head + nape (slate, smooth) */}
            <path
              d="M118 60
                 Q165 58 188 90
                 Q200 118 188 148
                 Q170 168 138 168
                 Q150 150 156 128
                 Q160 104 150 84
                 Q138 68 118 64 Z"
              fill="url(#backGrad)"
            />

            {/* subtle feather streaks on nape */}
            <g stroke="#1b2230" strokeWidth="0.8" fill="none" opacity="0.55" strokeLinecap="round">
              <path d="M150 80 Q162 92 168 108" />
              <path d="M158 92 Q170 108 172 128" />
              <path d="M160 112 Q172 128 168 148" />
              <path d="M148 100 Q158 118 156 138" />
              <path d="M170 100 Q180 116 178 138" />
              <path d="M140 78 Q150 90 156 104" />
            </g>

            {/* main head crown (dark hood) */}
            <path
              d="M70 108
                 Q66 82 92 70
                 Q120 58 148 70
                 Q170 82 172 108
                 Q172 122 162 130
                 L150 132
                 Q140 128 128 128
                 Q108 128 92 132
                 Q78 132 72 124 Z"
              fill="url(#hoodGrad)"
            />

            {/* hood subtle feather texture */}
            <g stroke="#0d1320" strokeWidth="0.7" fill="none" opacity="0.5" strokeLinecap="round">
              <path d="M86 80 Q96 88 100 100" />
              <path d="M104 74 Q112 84 116 98" />
              <path d="M124 72 Q130 84 132 100" />
              <path d="M142 76 Q146 88 146 102" />
              <path d="M156 86 Q160 96 160 110" />
            </g>

            {/* white cheek / throat patch */}
            <path
              d="M70 110
                 Q72 124 84 132
                 Q98 138 112 136
                 Q124 134 130 128
                 L130 142
                 Q118 152 100 150
                 Q82 146 74 134 Z"
              fill="url(#throatGrad)"
            />

            {/* thick dark malar stripe (peregrine sideburn) */}
            <path
              d="M104 116
                 Q102 128 96 140
                 Q92 148 88 152
                 Q94 142 96 132
                 Q98 122 100 116 Z"
              fill="#1b2230"
            />

            {/* yellow eye ring */}
            <ellipse cx="108" cy="104" rx="10" ry={9 * (0.3 + 0.7 * blink)} fill="#f0b820" />
            {/* eye — dark fierce */}
            <ellipse cx="108" cy="104" rx="7.5" ry={7 * blink} fill="url(#eyeGrad)" />
            {/* pupil highlight */}
            <circle cx="110" cy="102" r="1.8" fill="#ffffff" opacity={blink} />
            <circle cx="106" cy="106" r="0.9" fill="#ffffff" opacity={0.6 * blink} />

            {/* brow ridge for sharp glare */}
            <path
              d="M96 94 Q108 90 122 96"
              stroke="#0d1320"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* yellow cere (base of beak) */}
            <path
              d="M78 102 Q70 102 64 108 Q62 114 66 118 Q74 116 84 114 Z"
              fill="url(#cereGrad)"
            />

            {/* upper beak — sleek hooked dark grey */}
            <path
              d={`M82 108
                  Q64 ${110 - beakGap * 0.15} 48 ${116 - beakGap * 0.25}
                  Q40 ${118 - beakGap * 0.15} 44 ${124 - beakGap * 0.1}
                  Q50 ${126 - beakGap * 0.08} 56 ${124 - beakGap * 0.05}
                  Q70 ${120 - beakGap * 0.03} 84 ${116 - beakGap * 0.02} Z`}
              fill="url(#beakGrad)"
            />
            {/* tomial tooth notch shadow */}
            <path
              d={`M58 ${122 - beakGap * 0.05} Q62 ${124 - beakGap * 0.03} 66 ${122 - beakGap * 0.03}`}
              stroke="#000"
              strokeWidth="0.6"
              fill="none"
              opacity="0.7"
            />
            {/* beak highlight */}
            <path
              d={`M52 ${116 - beakGap * 0.18} Q68 ${114 - beakGap * 0.1} 82 ${112 - beakGap * 0.04}`}
              stroke="#8a93a3"
              strokeWidth="0.8"
              fill="none"
              opacity="0.55"
              strokeLinecap="round"
            />
            {/* nostril on cere */}
            <ellipse cx="72" cy="110" rx="1.6" ry="1.6" fill="#3a2a00" />

            {/* lower beak (mouth opens) */}
            {beakGap > 0.3 && (
              <path
                d={`M82 ${114 + beakGap * 0.05}
                    Q66 ${118 + beakGap * 0.4} 52 ${122 + beakGap * 0.7}
                    Q46 ${124 + beakGap * 0.85} 54 ${128 + beakGap * 1.0}
                    Q70 ${126 + beakGap * 0.8} 84 ${120 + beakGap * 0.45} Z`}
                fill="url(#beakGrad)"
              />
            )}
            {/* mouth interior when wide */}
            {beakGap > 1.2 && (
              <path
                d={`M58 ${122 + beakGap * 0.4} Q68 ${124 + beakGap * 0.6} 80 ${120 + beakGap * 0.3}
                    Q70 ${126 + beakGap * 0.9} 60 ${126 + beakGap * 0.8} Z`}
                fill="#3a1a1a"
                opacity="0.85"
              />
            )}
            {beakGap > 3.5 && (
              <ellipse cx={66} cy={124 + beakGap * 0.55} rx={beakGap * 0.55} ry={beakGap * 0.2} fill="#a83a4f" opacity="0.85" />
            )}

            {/* shoulder hint — slate feathers below head */}
            <path
              d="M88 150 Q120 168 162 160 Q170 170 158 178 Q120 184 92 174 Q82 166 88 150 Z"
              fill="url(#backGrad)"
              opacity="0.9"
            />
            {/* shoulder barring */}
            <g stroke="#1b2230" strokeWidth="0.7" fill="none" opacity="0.5" strokeLinecap="round">
              <path d="M100 162 Q120 170 150 166" />
              <path d="M104 170 Q124 176 148 172" />
            </g>
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
