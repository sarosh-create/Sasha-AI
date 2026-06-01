# Expand Lab, Explainers, Social & A11y

Big batch — grouped into 5 deliverables. I'll ship in one pass.

## 1. Virtual Lab: more experiments + unlocks + hints

**New experiments** (added to `_authenticated.lab.tsx`):
- Physics: Pendulum (existing), Ohm's Law circuit, Refraction through prism, Specific heat capacity
- Chemistry: Titration (existing), Flame tests, Rates of reaction (Mg + HCl), Electrolysis of copper sulphate
- Biology: Osmosis (existing), Food tests (Benedict/Biuret/iodine), Photosynthesis (pondweed bubble count), Leaf chromatography

**Unlock system**: Each experiment has `requiredLevel` and `requiredQuizzes` (e.g. "complete 2 chemistry quizzes ≥70%"). Locked cards show a 🔒 with the unlock condition. Computed client-side from `profiles.level` + `quizzes` table reads — no schema change needed.

**Hint & recovery system**:
- Each step exposes a `hint` string (always-available "💡 Hint" button → toast).
- Wrong apparatus pick: shake animation + soft "❌ Not yet — try something that…" toast, NO progress loss (current code just blocks).
- After 2 wrong tries on a step: auto-reveals correct next item with a dimmed glow ("Guided mode").
- New "Undo last step" button to recover misorderings instead of restarting.

## 2. Funny Explainers: save & replay with timestamps

**New table `explainer_reels`**: `user_id`, `topic`, `scenes jsonb`, `created_at`. Each scene already has emoji/title/line; I'll add `keyConcept: bool` + `timestampSec: number` (assigned on generate: even spacing across 60s, marking scenes the AI tags as core).

**Tweaked SYSTEM prompt** in `explainers.tsx`: ask the model to add `"keyConcept": true` to 2-3 scenes that hold the actual learning beats.

**UI additions**:
- "💾 Save reel" button after generation → inserts row.
- New `/explainers/library` route: grid of saved reels per topic, click to replay.
- Replay view: same scene viewer + a timeline strip showing each scene's `timestampSec` with star markers on key concepts; click marker to jump.
- Auto-play mode with 8s per scene + progress bar.

## 3. Leaderboard

**New route `_authenticated.leaderboard.tsx`**:
- Tabs: Weekly XP / All-time XP / Lab XP / Streak.
- Reads `profiles` ordered by relevant column (add `lab_xp` int column; `addLabXp` helper bumps both `xp` and `lab_xp`).
- For weekly XP: new view computed from `study_logs` + a `weekly_xp` materialized helper — simpler: store `xp_week` int + `xp_week_start` date on profile, reset on first action of new ISO week.
- Shows top 50; highlights current user's row even if outside top 50 (separate query).
- Anonymous opt-in: `profiles.leaderboard_opt_in bool default true`; opt-out hides display_name and shows "Anonymous Owl".

**Daily challenges & badges** are already in `gamification.ts`; I'll:
- Add 3 new lab/streak-themed challenges to the pool ("Run 1 experiment", "Score 100% on a quiz", "Save 1 explainer reel").
- Add 4 new badges: `lab_3` (3 experiments), `lab_all_p3` (one per subject), `reel_saver` (save 5 reels), `leaderboard_top10`.

## 4. Playful UI polish

- 6 confetti variants in `gamification.ts`: `fireConfetti('default'|'stars'|'hearts'|'school'|'rainbow'|'fireworks')` — wire to level-up, badge, quiz 100%, lab complete, streak milestone, reel save.
- Emoji reaction bursts: small `<EmojiBurst emoji="🎉" />` component that animates 6 floating emojis upward; used on correct lab step, quiz correct answer, challenge complete.
- Mascot reacts: extend `Mascot` with `mood="cheer"|"think"|"oops"` triggered by these events via a small zustand store (or context).

## 5. Color-blind-friendly contrast modes

- New `accessibility` section in profile + a header toggle (gear icon dropdown).
- Modes: `default`, `deuteranopia`, `protanopia`, `tritanopia`, `high-contrast`.
- Implemented as `data-a11y="..."` on `<html>` with overriding CSS variables in `styles.css` for `--primary`, `--accent`, `--destructive`, `--warning`, `--success` — chosen from CB-safe palettes (e.g. blue/orange instead of red/green).
- Persisted in `localStorage` + `profiles.a11y_mode` column.
- Tag-color picker in notes also respects mode (swap red→orange, green→blue).

---

## Database changes (one migration)

1. `ALTER TABLE profiles ADD COLUMN lab_xp int NOT NULL DEFAULT 0, ADD COLUMN xp_week int NOT NULL DEFAULT 0, ADD COLUMN xp_week_start date, ADD COLUMN leaderboard_opt_in bool NOT NULL DEFAULT true, ADD COLUMN a11y_mode text NOT NULL DEFAULT 'default'`
2. `CREATE TABLE explainer_reels(...)` + grants + RLS (own rows).
3. Add `quiz_id`/`lab_experiment` columns to `study_logs` if useful (optional — skip for now).

## Order of execution

1. Migration (awaits your approval).
2. After approval: gamification.ts updates, lab.tsx rewrite, explainers + new library route, leaderboard route, a11y toggle + styles, mascot/emoji-burst components, sidebar links.

Estimated ~10 files touched / created. Ready to start with the migration on your go-ahead.