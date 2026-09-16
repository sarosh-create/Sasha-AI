/**
 * The study schedule generator and the roadmap timeline share one saved plan,
 * so a plan made before signing up still shows up on the study path later.
 */
export type SavedScheduleDay = {
  iso: string;
  label: string;
  subject: string;
  focus: string;
  rest: boolean;
  blocks: { minutes: number; what: string }[];
};

export type SavedSchedule = {
  board: string;
  examDate: string;
  minutes: number;
  savedAt: string;
  days: SavedScheduleDay[];
};

const KEY = "sasha:studySchedule";

export function saveSchedule(schedule: SavedSchedule) {
  try {
    localStorage.setItem(KEY, JSON.stringify(schedule));
  } catch {
    // Private browsing — the plan simply won't persist.
  }
}

export function loadSchedule(): SavedSchedule | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSchedule;
    if (!Array.isArray(parsed?.days)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSchedule() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Only today onwards is useful on the roadmap. */
export function upcomingDays(schedule: SavedSchedule, limit = 14): SavedScheduleDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return schedule.days.filter((d) => new Date(d.iso).getTime() >= today.getTime()).slice(0, limit);
}
