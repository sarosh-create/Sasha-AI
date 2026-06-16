// Customizable SVG doll avatar. Pure SVG so no AI / image credits are used.
import { cn } from "@/lib/utils";

export type DollGender = "male" | "female" | "neutral";
export type DollExpression = "happy" | "smirk" | "focused" | "sleepy" | "surprised" | "wink";
export type DollHair =
  | "short" | "buzz" | "wavy" | "long" | "ponytail" | "bun" | "curly" | "bald" | "hijab" | "mohawk";
export type DollBody = "slim" | "regular" | "athletic" | "round";
export type DollOutfit = "tshirt" | "hoodie" | "uniform" | "dress" | "blazer" | "tank";
export type DollAccessory = "none" | "glasses" | "shades" | "earring" | "headphones" | "cap" | "crown";

export type DollConfig = {
  gender: DollGender;
  skin: string;        // hex
  hair: DollHair;
  hairColor: string;
  expression: DollExpression;
  body: DollBody;
  outfit: DollOutfit;
  outfitColor: string;
  accessory: DollAccessory;
  background: string;
};

export const DEFAULT_DOLL: DollConfig = {
  gender: "neutral",
  skin: "#e0b48a",
  hair: "short",
  hairColor: "#2b1d14",
  expression: "happy",
  body: "regular",
  outfit: "tshirt",
  outfitColor: "#5b6cff",
  accessory: "none",
  background: "#fff3d6",
};

export const SKIN_TONES = ["#fde0c5", "#f1c27d", "#e0b48a", "#c68863", "#a16a4d", "#6b4226", "#3d2418"];
export const HAIR_COLORS = ["#2b1d14", "#5b3a1e", "#a66b3a", "#d4a05a", "#e8e2d6", "#c0c0c0", "#222", "#ff5e8a", "#7c3aed"];
export const OUTFIT_COLORS = ["#5b6cff", "#ef4444", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#111827", "#f5f5dc"];
export const BG_COLORS = ["#fff3d6", "#e0f2fe", "#fae8ff", "#dcfce7", "#fee2e2", "#f1f5f9", "#1e293b"];

export function DollAvatar({ config, className, size = 200 }: { config: DollConfig; className?: string; size?: number }) {
  const c = { ...DEFAULT_DOLL, ...config };
  const bodyWidth = c.body === "slim" ? 60 : c.body === "regular" ? 72 : c.body === "athletic" ? 84 : 96;
  const cheekFill = "#ff8a99";

  // Eye / mouth shapes per expression
  const eyes = (() => {
    switch (c.expression) {
      case "happy": return <><circle cx="88" cy="98" r="4.5" fill="#111" /><circle cx="112" cy="98" r="4.5" fill="#111" /></>;
      case "smirk": return <><circle cx="88" cy="98" r="4" fill="#111" /><circle cx="112" cy="98" r="4" fill="#111" /></>;
      case "focused": return <><rect x="82" y="96" width="12" height="3" rx="1.5" fill="#111" /><rect x="106" y="96" width="12" height="3" rx="1.5" fill="#111" /></>;
      case "sleepy": return <><path d="M82 99 Q88 95 94 99" stroke="#111" strokeWidth="2.2" fill="none" strokeLinecap="round" /><path d="M106 99 Q112 95 118 99" stroke="#111" strokeWidth="2.2" fill="none" strokeLinecap="round" /></>;
      case "surprised": return <><circle cx="88" cy="98" r="5.5" fill="#111" /><circle cx="112" cy="98" r="5.5" fill="#111" /></>;
      case "wink": return <><circle cx="88" cy="98" r="4.5" fill="#111" /><path d="M106 99 Q112 95 118 99" stroke="#111" strokeWidth="2.2" fill="none" strokeLinecap="round" /></>;
    }
  })();
  const mouth = (() => {
    switch (c.expression) {
      case "happy": return <path d="M88 118 Q100 128 112 118" stroke="#7a1e2b" strokeWidth="2.6" fill="#ff6b81" strokeLinecap="round" />;
      case "smirk": return <path d="M90 120 Q104 124 112 116" stroke="#7a1e2b" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
      case "focused": return <path d="M90 120 L110 120" stroke="#7a1e2b" strokeWidth="2.4" strokeLinecap="round" />;
      case "sleepy": return <path d="M93 121 Q100 119 107 121" stroke="#7a1e2b" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
      case "surprised": return <ellipse cx="100" cy="121" rx="6" ry="7" fill="#7a1e2b" />;
      case "wink": return <path d="M88 118 Q100 126 112 118" stroke="#7a1e2b" strokeWidth="2.4" fill="#ff6b81" strokeLinecap="round" />;
    }
  })();

  // Hair shapes
  const hair = (() => {
    switch (c.hair) {
      case "bald": return null;
      case "buzz": return <path d="M65 80 Q100 55 135 80 L135 90 Q100 78 65 90 Z" fill={c.hairColor} opacity="0.85" />;
      case "short": return <path d="M62 92 Q60 55 100 50 Q140 55 138 92 Q130 76 100 76 Q70 76 62 92 Z" fill={c.hairColor} />;
      case "wavy": return <path d="M58 100 Q56 50 100 48 Q144 50 142 100 Q132 80 120 86 Q108 76 100 84 Q92 76 80 86 Q68 80 58 100 Z" fill={c.hairColor} />;
      case "long": return <><path d="M58 100 Q56 50 100 48 Q144 50 142 100 L142 150 Q120 142 100 142 Q80 142 58 150 Z" fill={c.hairColor} /><path d="M62 92 Q60 55 100 50 Q140 55 138 92 Q130 76 100 76 Q70 76 62 92 Z" fill={c.hairColor} /></>;
      case "ponytail": return <><path d="M62 92 Q60 55 100 50 Q140 55 138 92 Q130 76 100 76 Q70 76 62 92 Z" fill={c.hairColor} /><ellipse cx="148" cy="115" rx="10" ry="20" fill={c.hairColor} /></>;
      case "bun": return <><circle cx="100" cy="48" r="14" fill={c.hairColor} /><path d="M64 90 Q62 60 100 58 Q138 60 136 90 Q128 78 100 78 Q72 78 64 90 Z" fill={c.hairColor} /></>;
      case "curly": return <><circle cx="70" cy="72" r="14" fill={c.hairColor} /><circle cx="88" cy="58" r="14" fill={c.hairColor} /><circle cx="110" cy="56" r="14" fill={c.hairColor} /><circle cx="130" cy="72" r="14" fill={c.hairColor} /><circle cx="68" cy="92" r="12" fill={c.hairColor} /><circle cx="132" cy="92" r="12" fill={c.hairColor} /></>;
      case "hijab": return <path d="M48 110 Q40 60 100 44 Q160 60 152 110 L152 150 Q126 138 100 138 Q74 138 48 150 Z" fill={c.hairColor} />;
      case "mohawk": return <path d="M88 40 L112 40 L116 92 L84 92 Z" fill={c.hairColor} />;
    }
  })();

  // Outfit
  const outfit = (() => {
    const cx = 100;
    const top = 150;
    const w = bodyWidth;
    switch (c.outfit) {
      case "tshirt": return <path d={`M${cx - w / 2} ${top} L${cx - w / 2 - 8} ${top + 22} L${cx - w / 2 + 4} ${top + 30} L${cx - w / 2 + 4} ${top + 60} L${cx + w / 2 - 4} ${top + 60} L${cx + w / 2 - 4} ${top + 30} L${cx + w / 2 + 8} ${top + 22} L${cx + w / 2} ${top} Z`} fill={c.outfitColor} />;
      case "hoodie": return <><path d={`M${cx - w / 2 - 6} ${top - 4} Q${cx} ${top + 12} ${cx + w / 2 + 6} ${top - 4} L${cx + w / 2 + 10} ${top + 60} L${cx - w / 2 - 10} ${top + 60} Z`} fill={c.outfitColor} /><path d={`M${cx - 16} ${top - 6} Q${cx} ${top + 8} ${cx + 16} ${top - 6}`} fill="none" stroke="#0006" strokeWidth="2" /></>;
      case "uniform": return <><rect x={cx - w / 2} y={top} width={w} height="60" fill={c.outfitColor} /><path d={`M${cx - 10} ${top} L${cx} ${top + 18} L${cx + 10} ${top} Z`} fill="#fff" /><rect x={cx - 3} y={top + 14} width="6" height="22" fill="#e11d48" /></>;
      case "dress": return <path d={`M${cx - w / 2} ${top} L${cx - w / 2 - 30} ${top + 70} L${cx + w / 2 + 30} ${top + 70} L${cx + w / 2} ${top} Z`} fill={c.outfitColor} />;
      case "blazer": return <><rect x={cx - w / 2} y={top} width={w} height="60" fill={c.outfitColor} /><path d={`M${cx - w / 2} ${top} L${cx} ${top + 24} L${cx + w / 2} ${top}`} fill="#fff" /><line x1={cx} y1={top + 24} x2={cx} y2={top + 60} stroke="#0008" strokeWidth="1.5" /></>;
      case "tank": return <path d={`M${cx - w / 2 + 10} ${top - 4} L${cx - w / 2 + 4} ${top + 60} L${cx + w / 2 - 4} ${top + 60} L${cx + w / 2 - 10} ${top - 4} Q${cx} ${top + 14} ${cx - w / 2 + 10} ${top - 4} Z`} fill={c.outfitColor} />;
    }
  })();

  // Accessory
  const accessory = (() => {
    switch (c.accessory) {
      case "none": return null;
      case "glasses": return <g><circle cx="88" cy="99" r="9" fill="none" stroke="#111" strokeWidth="2.2" /><circle cx="112" cy="99" r="9" fill="none" stroke="#111" strokeWidth="2.2" /><line x1="97" y1="99" x2="103" y2="99" stroke="#111" strokeWidth="2" /></g>;
      case "shades": return <g><rect x="78" y="92" width="20" height="12" rx="3" fill="#111" /><rect x="102" y="92" width="20" height="12" rx="3" fill="#111" /><line x1="98" y1="98" x2="102" y2="98" stroke="#111" strokeWidth="2" /></g>;
      case "earring": return <circle cx="64" cy="118" r="3" fill="#facc15" stroke="#a16207" strokeWidth="1" />;
      case "headphones": return <g><path d="M58 82 Q100 32 142 82" stroke="#111" strokeWidth="6" fill="none" strokeLinecap="round" /><rect x="52" y="80" width="14" height="22" rx="5" fill="#111" /><rect x="134" y="80" width="14" height="22" rx="5" fill="#111" /></g>;
      case "cap": return <g><path d="M60 78 Q100 50 140 78 L140 92 L60 92 Z" fill="#1d4ed8" /><path d="M60 92 L36 100 L60 100 Z" fill="#1d4ed8" /></g>;
      case "crown": return <g><path d="M70 70 L80 50 L92 68 L100 46 L108 68 L120 50 L130 70 Z" fill="#facc15" stroke="#a16207" strokeWidth="1.5" /><circle cx="100" cy="60" r="2.5" fill="#ef4444" /></g>;
    }
  })();

  return (
    <svg viewBox="0 0 200 220" width={size} height={size} className={cn("select-none", className)} role="img" aria-label="Customizable doll avatar">
      <defs>
        <radialGradient id="bg-grad" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={c.background} stopOpacity="1" />
          <stop offset="100%" stopColor={c.background} stopOpacity="0.4" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="110" r="100" fill="url(#bg-grad)" />
      {/* Neck */}
      <rect x="92" y="140" width="16" height="18" fill={c.skin} />
      {/* Body / shoulders */}
      <ellipse cx="100" cy={150 + 60} rx={bodyWidth / 2 + 12} ry="18" fill={c.skin} opacity="0" />
      {outfit}
      {/* Head */}
      <ellipse cx="100" cy="100" rx="42" ry="48" fill={c.skin} />
      {/* Ears */}
      <ellipse cx="60" cy="108" rx="6" ry="9" fill={c.skin} />
      <ellipse cx="140" cy="108" rx="6" ry="9" fill={c.skin} />
      {/* Cheeks */}
      <circle cx="76" cy="116" r="6" fill={cheekFill} opacity="0.55" />
      <circle cx="124" cy="116" r="6" fill={cheekFill} opacity="0.55" />
      {/* Nose */}
      <path d="M100 104 Q102 114 100 118 Q98 119 96 117" stroke="#0004" strokeWidth="1.3" fill="none" />
      {eyes}
      {mouth}
      {hair}
      {accessory}
      {/* Gender hint: subtle eyelashes for female */}
      {c.gender === "female" && (
        <g stroke="#111" strokeWidth="1.5" strokeLinecap="round" fill="none">
          <path d="M82 94 L80 91" /><path d="M88 92 L88 89" /><path d="M94 94 L96 91" />
          <path d="M106 94 L104 91" /><path d="M112 92 L112 89" /><path d="M118 94 L120 91" />
        </g>
      )}
    </svg>
  );
}
