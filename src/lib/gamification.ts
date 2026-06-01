import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export const TAG_COLORS: Record<string, string> = {
  "key-idea": "#a78bfa",
  "confused": "#f59e0b",
  "memorize": "#22c55e",
  "definition": "#3b82f6",
  "exam-tip": "#ec4899",
  "custom": "#64748b",
};
export const TAG_LABELS: Record<string, string> = {
  "key-idea": "Key idea",
  "confused": "Confused",
  "memorize": "Memorize",
  "definition": "Definition",
  "exam-tip": "Exam tip",
  "custom": "Custom",
};

export const xpForLevel = (level: number) => 50 * level * level;
export function levelInfo(xp: number) {
  let lvl = 1;
  while (xpForLevel(lvl + 1) <= xp) lvl++;
  const curBase = xpForLevel(lvl);
  const nextBase = xpForLevel(lvl + 1);
  const into = xp - curBase;
  const span = nextBase - curBase;
  return { level: lvl, into, span, pct: Math.round((into / span) * 100) };
}

export const BADGES: { code: string; label: string; emoji: string; hint: string }[] = [
  { code: "first_quiz", label: "First Quiz", emoji: "🎯", hint: "Complete your first quiz" },
  { code: "first_note", label: "Note Taker", emoji: "📝", hint: "Save your first note" },
  { code: "streak_7", label: "Week Warrior", emoji: "🔥", hint: "7-day streak" },
  { code: "streak_30", label: "Unstoppable", emoji: "🚀", hint: "30-day streak" },
  { code: "xp_100", label: "Rising Star", emoji: "⭐", hint: "Earn 100 XP" },
  { code: "xp_500", label: "Scholar", emoji: "🎓", hint: "Earn 500 XP" },
  { code: "perfect_quiz", label: "Flawless", emoji: "💯", hint: "Score 100% on a quiz" },
  { code: "subject_mastered", label: "Subject Mastered", emoji: "🏆", hint: "Reach 85+ mastery" },
  { code: "path_lesson_1", label: "Path Starter", emoji: "🧭", hint: "Complete first path lesson" },
  { code: "challenge_done", label: "Daily Champ", emoji: "✅", hint: "Complete a daily challenge" },
  { code: "room_joiner", label: "Study Buddy", emoji: "👥", hint: "Join a study room" },
  { code: "lab_3", label: "Lab Rat", emoji: "🧪", hint: "Finish 3 lab experiments" },
  { code: "lab_all_p3", label: "P3 Master", emoji: "🔬", hint: "Run a lab in P, C and B" },
  { code: "reel_saver", label: "Reel Director", emoji: "🎬", hint: "Save 5 explainer reels" },
  { code: "leaderboard_top10", label: "Top 10", emoji: "🥇", hint: "Reach top 10 on a leaderboard" },
];

export async function awardBadge(userId: string, code: string) {
  const badge = BADGES.find((b) => b.code === code);
  if (!badge) return;
  const { error } = await supabase
    .from("achievements")
    .insert({ user_id: userId, code });
  if (!error) {
    toast.success(`Badge unlocked: ${badge.emoji} ${badge.label}`);
    fireConfetti("stars");
  }
}

export type ConfettiVariant =
  | "default" | "stars" | "hearts" | "school" | "rainbow" | "fireworks";

export function fireConfetti(variant: ConfettiVariant = "default") {
  if (typeof window === "undefined") return;
  const palettes = {
    default: ["#a78bfa", "#7c3aed", "#3b82f6", "#22c55e", "#f59e0b"],
    stars: ["#FFD93D", "#FF6B6B", "#4D96FF", "#a78bfa"],
    hearts: ["#FF6B9D", "#FF85A2", "#FFC4D6", "#C44569"],
    school: ["#4D96FF", "#6BCB77", "#FFD93D", "#FF6B6B"],
    rainbow: ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#a78bfa", "#FF6B9D"],
    fireworks: ["#FFD93D", "#FF6B6B", "#4D96FF"],
  } as const;
  const colors = palettes[variant];

  if (variant === "fireworks") {
    const end = Date.now() + 800;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    return;
  }
  if (variant === "stars") {
    confetti({ particleCount: 60, spread: 100, origin: { y: 0.6 }, shapes: ["star"], colors });
    return;
  }
  if (variant === "hearts") {
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, scalar: 1.4, colors });
    return;
  }
  if (variant === "rainbow") {
    confetti({ particleCount: 140, spread: 120, origin: { y: 0.6 }, colors, ticks: 250 });
    return;
  }
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors });
}

function isoWeekStart(d = new Date()) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7;
  if (day !== 1) dt.setUTCDate(dt.getUTCDate() - (day - 1));
  return dt.toISOString().slice(0, 10);
}

export async function addXp(userId: string, amount: number, opts: { lab?: boolean } = {}) {
  const { data: p } = await supabase
    .from("profiles")
    .select("xp, level, lab_xp, xp_week, xp_week_start")
    .eq("user_id", userId)
    .maybeSingle() as any;
  if (!p) return;
  const newXp = (p.xp ?? 0) + amount;
  const newLevel = levelInfo(newXp).level;
  const weekStart = isoWeekStart();
  const sameWeek = p.xp_week_start === weekStart;
  const update: any = {
    xp: newXp,
    level: newLevel,
    xp_week: sameWeek ? (p.xp_week ?? 0) + amount : amount,
    xp_week_start: weekStart,
  };
  if (opts.lab) update.lab_xp = (p.lab_xp ?? 0) + amount;
  await supabase.from("profiles").update(update).eq("user_id", userId);
  if (newLevel > (p.level ?? 1)) {
    toast.success(`Level up! You're now Level ${newLevel} 🎉`);
    fireConfetti("fireworks");
  }
  if (newXp >= 100 && (p.xp ?? 0) < 100) await awardBadge(userId, "xp_100");
  if (newXp >= 500 && (p.xp ?? 0) < 500) await awardBadge(userId, "xp_500");
  return newXp;
}

export async function loseHeart(userId: string) {
  const { data: p } = await supabase
    .from("profiles")
    .select("hearts, hearts_refill_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!p) return;
  const next = Math.max(0, (p.hearts ?? 5) - 1);
  const refillAt = p.hearts_refill_at ?? new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase.from("profiles").update({ hearts: next, hearts_refill_at: refillAt }).eq("user_id", userId);
}

export async function refillHeartsIfDue(userId: string) {
  const { data: p } = await supabase
    .from("profiles")
    .select("hearts, hearts_refill_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!p || (p.hearts ?? 5) >= 5 || !p.hearts_refill_at) return;
  const due = new Date(p.hearts_refill_at).getTime();
  if (Date.now() < due) return;
  const elapsedMin = (Date.now() - due) / 60000;
  const gained = 1 + Math.floor(elapsedMin / 30);
  const next = Math.min(5, (p.hearts ?? 0) + gained);
  const refillAt = next >= 5 ? null : new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase.from("profiles").update({ hearts: next, hearts_refill_at: refillAt }).eq("user_id", userId);
}

const CHALLENGE_POOL = [
  { code: "lessons2", label: "Complete 2 path lessons", target: 2 },
  { code: "quiz80", label: "Score 80% on a quiz", target: 1 },
  { code: "study20", label: "Study for 20 minutes", target: 20 },
  { code: "note1", label: "Save a new note", target: 1 },
  { code: "tutor3", label: "Send 3 tutor messages", target: 3 },
  { code: "lab1", label: "Run 1 lab experiment", target: 1 },
  { code: "quiz100", label: "Score 100% on a quiz", target: 1 },
  { code: "reel1", label: "Save 1 explainer reel", target: 1 },
];

export async function ensureDailyChallenges(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("daily_challenges")
    .select("id")
    .eq("user_id", userId)
    .eq("for_date", today);
  if (existing && existing.length >= 3) return;
  const seed = Date.parse(today) / 86400000;
  const shuffled = [...CHALLENGE_POOL].sort(
    (a, b) => ((seed * 9301 + a.code.length) % 7) - ((seed * 9301 + b.code.length) % 7),
  );
  const picks = shuffled.slice(0, 3);
  await supabase.from("daily_challenges").insert(
    picks.map((p) => ({ user_id: userId, for_date: today, ...p })),
  );
}

export async function bumpChallenge(userId: string, code: string, amount = 1) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: c } = await supabase
    .from("daily_challenges")
    .select("id, progress, target, completed, label")
    .eq("user_id", userId)
    .eq("for_date", today)
    .eq("code", code)
    .maybeSingle();
  if (!c || c.completed) return;
  const progress = Math.min(c.target, c.progress + amount);
  const completed = progress >= c.target;
  await supabase.from("daily_challenges").update({ progress, completed }).eq("id", c.id);
  if (completed) {
    toast.success(`Challenge complete: ${c.label} +30 XP`);
    await addXp(userId, 30);
    await awardBadge(userId, "challenge_done");
    fireConfetti("rainbow");
  }
}

/** Count lab experiments completed (from study_logs entries activity LIKE 'lab:%'). */
export async function checkLabBadges(userId: string) {
  const { data } = await supabase
    .from("study_logs")
    .select("activity")
    .eq("user_id", userId)
    .like("activity", "lab:%");
  if (!data) return;
  if (data.length >= 3) await awardBadge(userId, "lab_3");
  const subjects = new Set(data.map((d: any) => (d.activity as string).split(":")[1]?.split("_")[0]));
  if (["physics", "chemistry", "biology"].every((s) => subjects.has(s))) {
    await awardBadge(userId, "lab_all_p3");
  }
}

export async function checkReelBadges(userId: string) {
  const { count } = await supabase
    .from("explainer_reels" as any)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= 5) await awardBadge(userId, "reel_saver");
}
