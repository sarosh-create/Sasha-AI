import { supabase } from "@/integrations/supabase/client";

/**
 * Mastery = proof of improvement.
 *
 * Every completed, strictly-marked quiz is a datapoint. Per topic we keep the
 * ordered percentage history so a student can see (and screenshot) the curve
 * that shows they actually got better — not just that they showed up.
 */

export type Attempt = {
  at: string;
  pct: number;
  score: number;
  total: number;
};

export type TopicMastery = {
  topic: string;
  subjectId: string | null;
  attempts: Attempt[];
  first: number;
  latest: number;
  best: number;
  /** Weighted toward recent attempts — the number we call "mastery". */
  mastery: number;
  delta: number;
  questionsMarked: number;
  level: "mastered" | "solid" | "building" | "shaky";
};

export function masteryLevel(mastery: number): TopicMastery["level"] {
  if (mastery >= 85) return "mastered";
  if (mastery >= 70) return "solid";
  if (mastery >= 50) return "building";
  return "shaky";
}

export const LEVEL_LABEL: Record<TopicMastery["level"], string> = {
  mastered: "Mastered",
  solid: "Solid",
  building: "Building",
  shaky: "Needs work",
};

/** Recency-weighted average: the last attempt counts most. */
function weightedMastery(attempts: Attempt[]) {
  if (attempts.length === 0) return 0;
  let num = 0;
  let den = 0;
  attempts.forEach((a, i) => {
    const w = i + 1; // linear recency weight
    num += a.pct * w;
    den += w;
  });
  return Math.round(num / den);
}

type QuizRow = {
  topic: string | null;
  subject_id: string | null;
  score: number | null;
  total: number | null;
  completed: boolean | null;
  created_at: string;
};

export function buildMastery(rows: QuizRow[]): TopicMastery[] {
  const byTopic = new Map<string, { subjectId: string | null; attempts: Attempt[]; marked: number }>();

  for (const r of rows) {
    if (!r.completed || !r.total || r.score === null || r.score === undefined) continue;
    const topic = (r.topic ?? "General").trim() || "General";
    const pct = Math.round((r.score / r.total) * 100);
    const entry = byTopic.get(topic) ?? { subjectId: r.subject_id, attempts: [], marked: 0 };
    entry.attempts.push({ at: r.created_at, pct, score: r.score, total: r.total });
    entry.marked += r.total;
    byTopic.set(topic, entry);
  }

  const out: TopicMastery[] = [];
  for (const [topic, entry] of byTopic) {
    const attempts = entry.attempts.sort((a, b) => a.at.localeCompare(b.at));
    const mastery = weightedMastery(attempts);
    out.push({
      topic,
      subjectId: entry.subjectId,
      attempts,
      first: attempts[0].pct,
      latest: attempts[attempts.length - 1].pct,
      best: Math.max(...attempts.map((a) => a.pct)),
      mastery,
      delta: attempts[attempts.length - 1].pct - attempts[0].pct,
      questionsMarked: entry.marked,
      level: masteryLevel(mastery),
    });
  }
  return out.sort((a, b) => b.attempts.length - a.attempts.length || b.mastery - a.mastery);
}

export async function fetchMastery(userId: string): Promise<TopicMastery[]> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("topic, subject_id, score, total, completed, created_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return buildMastery((data ?? []) as QuizRow[]);
}

export function overallMastery(topics: TopicMastery[]) {
  if (topics.length === 0) {
    return { mastery: 0, delta: 0, questionsMarked: 0, improvedTopics: 0 };
  }
  const mastery = Math.round(topics.reduce((s, t) => s + t.mastery, 0) / topics.length);
  const withHistory = topics.filter((t) => t.attempts.length > 1);
  const delta = withHistory.length
    ? Math.round(withHistory.reduce((s, t) => s + t.delta, 0) / withHistory.length)
    : 0;
  return {
    mastery,
    delta,
    questionsMarked: topics.reduce((s, t) => s + t.questionsMarked, 0),
    improvedTopics: withHistory.filter((t) => t.delta > 0).length,
  };
}
