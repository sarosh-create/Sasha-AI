# Build plan

Six-part build. I'll ship in this order so you can review each piece.

## 1. Duolingo-style lessons (replaces tutor redirect)

- New `lesson_content` table: per `subject + topic + grade_level + board`, stores intro slides (JSON: title, body, image_url, emoji), worked example, mini-quiz (3-5 MCQ).
- New route `/lesson/$id` renders slides → "Got it" → built-in quiz → mark lesson done. Never jumps to AI tutor.
- Study path lessons now link here instead of `/tutor`.
- **Hybrid content**: when a student opens a lesson with no content yet, an edge function calls Lovable AI (Gemini 3) to draft slides + quiz tailored to their grade/board, saves draft to DB with `status='draft'`. Admin sees drafts in panel and one-click approves/edits before publishing.
- Subject-aware visuals: AI prompt instructs labeled diagrams (e.g. cell organelles for Bio), step-by-step math working, etc.

## 2. Teachers CRUD + student access

- Admin Teachers tab gets a real form (name, subject, bio, avatar upload to `sasha` bucket).
- New `teacher_students` link table; admin assigns students to teachers (or teacher's subject auto-matches student subjects).
- Approved teachers get `teacher` role → new `/teacher` dashboard: list of their students, view profile, study path, recent quiz scores, open 1:1 chat.
- RLS: teachers can read profiles/subjects/quizzes for linked students only.

## 3. Lock creator actions to admin + co-admins

- Extend `app_role` with `co_admin`. `msn4sg@gmail.com` stays primary admin.
- New Admin tab "Co-admins": invite by email, grant/revoke.
- RLS on `events`, `schemes`, `live_classes`: insert/update/delete only if `has_role(admin)` OR `has_role(co_admin)`. Students keep read access.

## 4. Past papers library

- New `past_papers` table: title, board, level, subject, year, paper_type, pdf_url, marking_scheme_url.
- Storage bucket `past-papers` (public read).
- Admin tab: upload PDF + metadata.
- Student route `/papers`: filter by board/subject/year, download PDF + scheme.

## 5. Community Q&A chat (WhatsApp-style)

- New `chat_channels` table (name, subject, board, created_by) — admin/co-admin creates.
- `channel_messages` (channel_id, user_id, body, parent_id for replies).
- `channel_message_ratings` (thumbs up on helpful answers).
- Realtime enabled; RLS: anyone signed in can read + post; only admin/co-admin/teachers can pin or delete.
- Sidebar entry "Community". Channel list → channel view with live messages, rating buttons, teacher/admin badges.

## 6. SEO boost

- Per-route head() metadata on public routes (already partial).
- JSON-LD `EducationalOrganization` + `Course` schema on landing/lesson pages.
- Sitemap regenerated to include new public routes.
- Open Graph image for landing page.

## Technical notes

- All schema changes in one migration per part; RLS + GRANTs included.
- Lesson AI drafting via `createServerFn` calling Lovable AI Gateway (`google/gemini-3-flash-preview`).
- Avatar/PDF uploads use existing `sasha` bucket + new `past-papers` bucket.
- Realtime chat uses Supabase Realtime on `channel_messages`.

## Out of scope this round

- Email notifications (needs custom domain setup separately).
- Video calls inside live classes (still external meeting URL).

Reply "go" to start with part 1, or tell me to reorder / drop anything.