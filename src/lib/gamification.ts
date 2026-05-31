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
export const levelForXp = (xp: number) => Math.max(1, Math.floor(Math.sqrt(xp / 50)) + (xp >= 50 ? 0 : 0));
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
  { code: "subject_mastered", label: "Subject Mastered", emoji: "🏆", hint: "Reach 85+ mastery in a subject" },
  { code: "path_lesson_1", label: "Path Starter", emoji: "🧭", hint: "Complete first path lesson" },
  { code: "challenge_done", label: "Daily Champ", emoji: "✅", hint: "Complete a daily challenge" },
  { code: "room_joiner", label: "Study Buddy", emoji: "👥", hint: "Join a study room" },
];

export async function awardBadge(userId: string, code: string) {
  const badge = BADGES.find((b) => b.code === code);
  if (!badge) return;
  const { error } = await supabase
    .from("achievements")
    .insert({ user_id: userId, code });
  if (!error) {
    toast.success(`Badge unlocked: ${badge.emoji} ${badge.label}`);
    fireConfetti();
  }
}

export function fireConfetti() {
  if (typeof window === "undefined") return;
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#a78bfa", "#7c3aed", "#3b82f6", "#22c55e", "#f59e0b"],
  });
}

export async function addXp(userId: string, amount: number) {
  const { data: p } = await supabase
    .from("profiles")
    .select("xp, level")
    .eq("user_id", userId)
    .maybeSingle();
  if (!p) return;
  const newXp = (p.xp ?? 0) + amount;
  const newLevel = levelInfo(newXp).level;
  await supabase.from("profiles").update({ xp: newXp, level: newLevel }).eq("user_id", userId);
  if (newLevel > (p.level ?? 1)) {
    toast.success(`Level up! You're now Level ${newLevel} 🎉`);
    fireConfetti();
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
];

export async function ensureDailyChallenges(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("daily_challenges")
    .select("id")
    .eq("user_id", userId)
    .eq("for_date", today);
  if (existing && existing.length >= 3) return;
  // pick 3 deterministically by day
  const seed = Date.parse(today) / 86400000;
  const shuffled = [...CHALLENGE_POOL].sort((a, b) => ((seed * 9301 + a.code.length) % 7) - ((seed * 9301 + b.code.length) % 7));
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
  await supabase.from("daily_challenges")
    .update({ progress, completed })
    .eq("id", c.id);
  if (completed) {
    toast.success(`Challenge complete: ${c.label} +30 XP`);
    await addXp(userId, 30);
    await awardBadge(userId, "challenge_done");
  }
}
