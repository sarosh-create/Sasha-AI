
## What I'll build

### 1. Color-coded notes
- New `notes` table: `subject_id`, `tag` (key-idea / confused / memorize / definition / custom), `color`, `title`, `body`, timestamps.
- New route `/notes`: grid of cards. Each card uses the **subject's color** as the left accent stripe, plus a **tag chip** in its own color. Filter by subject + tag.
- "New note" dialog from any subject in the dashboard/tutor — pre-fills subject + color.
- Quick-add from inside a tutor chat: "Save as note" button on any AI message.

### 2. Duolingo-style daily roadmap (path of daily lessons)
- New `lesson_path` table: per-user generated sequence of daily "lessons". Each lesson = 1 subject + 1 activity (teach → quiz → review) + estimated minutes + status (locked / available / done).
- Path is generated weekly from current mastery + days-to-exam (weak subjects appear more, exam-week pulls heavier).
- New route `/path`: vertical zig-zag of circular nodes (Duolingo-style), with the active node pulsing. Locked nodes are greyed. Tapping an available node opens the lesson (routes to tutor or quiz with the right subject).
- Replaces the old "Today's roadmap" card on the dashboard with a compact "Continue your path →" widget that deep-links into `/path`.

### 3. Gamification (Senpai-style fun)
- Extend `profiles`: `xp`, `level`, `hearts` (max 5), `hearts_refill_at`, `streak_freezes`.
- New `achievements` table (badge code, earned_at).
- New `daily_challenges` table (date, goal type, target, progress, completed).
- Rules:
  - +10 XP per correct quiz answer, +25 for completing a lesson, +50 for a perfect quiz.
  - Wrong quiz answer → −1 heart. Hearts refill 1 every 30 min (or instantly with a future "gem" — placeholder).
  - Streak freeze auto-consumes if you miss a day (max 2 stored, +1 every 7-day streak).
  - 3 rotating daily challenges (e.g. "Finish 2 lessons", "Score 80%+ on a quiz", "Study 20 min").
  - Badges: First Quiz, 7-Day Streak, 100 XP, Subject Mastered (≥85), Path Crusher, etc.
- New `<XPBar />`, `<HeartsRow />`, `<StreakChip />` in the app header. Toast + confetti on level-up / badge earn.
- New route `/achievements`: badge grid + level history.

### 4. Mascot companion ("Kata")
- Friendly mascot SVG (purple owl-style, matches palette) that lives in a corner of the dashboard, path, and after-quiz screens.
- Reacts to context: cheers on correct answers, gentle nudge on wrong, celebrates streak milestones, reminds you of daily challenge progress. Speech bubble with rotating mentor lines pulled from a small library (no AI call needed for these).

### 5. Study rooms (chat + video)
- New `study_rooms` table (name, subject_id, host_user_id, is_public, max_participants, created_at) + `room_messages` table (room_id, user_id, content, created_at) + `room_participants` (room_id, user_id, joined_at).
- New route `/rooms`: public room directory + "Create room".
- New route `/rooms/$id`: split layout — left = participants + text chat (Supabase Realtime), right = video tiles.
- **Video**: peer-to-peer WebRTC using free public STUN servers (Google's `stun:stun.l.google.com:19302`). Signalling happens over a Supabase Realtime channel per room. No TURN server, so it works for most users on the same NAT type but may fail behind strict symmetric NATs — acceptable for an MVP "free study session" feature. Capped at 4 participants per room to keep mesh peer count manageable.
- Text chat works for everyone regardless of WebRTC support.

### Technical notes
- All new tables: RLS on, scoped to `auth.uid()` for own rows; `study_rooms` + `room_messages` + `room_participants` allow `SELECT` for any authenticated user (rooms are public).
- Realtime publication enabled for `room_messages` and `room_participants`.
- Frontend logic only — quiz/tutor edge functions stay as-is; XP/hearts/challenge updates happen client-side after each interaction (RLS protects rows).
- Mascot uses inline SVG, no extra deps. Confetti uses `canvas-confetti` (tiny, edge-safe).

### Out of scope for this pass
- TURN server (paid) — rooms work without it but may fail on strict NAT.
- Friends list / 1-to-1 DMs (rooms only, for now).
- Push notifications.

If this looks right, approve and I'll ship it. If "study rooms with video" should be split into its own pass (it's ~40% of the work), tell me and I'll do the other three first.
