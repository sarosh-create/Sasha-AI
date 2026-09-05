REVOKE EXECUTE ON FUNCTION public.leaderboard(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leaderboard(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;

INSERT INTO public.teachers (user_id, name, email, subject, bio)
SELECT NULL, t.name, t.email, t.subject, t.bio
FROM (VALUES
  ('Ms. Ayesha Khan', 'ayesha.khan@sashaai.example', 'Biology', 'Cambridge-trained biology examiner with 12 years of A-Level marking experience.'),
  ('Mr. Daniel Osei', 'daniel.osei@sashaai.example', 'Mathematics', 'Edexcel maths specialist focused on exam technique and problem solving.'),
  ('Dr. Priya Nair', 'priya.nair@sashaai.example', 'Chemistry', 'PhD chemist teaching IB and A-Level chemistry with a practical-first approach.'),
  ('Mr. Omar Farid', 'omar.farid@sashaai.example', 'Physics', 'Physics teacher and past-paper marker for AQA and CIE.')
) AS t(name, email, subject, bio)
WHERE NOT EXISTS (SELECT 1 FROM public.teachers x WHERE x.email = t.email);

INSERT INTO public.profiles (user_id, display_name, exam_board, xp, xp_week, lab_xp, level, streak_count, leaderboard_opt_in, onboarded, status, status_emoji, bio)
SELECT gen_random_uuid(), p.display_name, p.board, p.xp, p.xp_week, p.lab_xp, p.level, p.streak, true, true, p.status, p.emoji, p.bio
FROM (VALUES
  ('Zara M.', 'Cambridge IGCSE', 4820, 640, 1200, 12, 34, 'Revising biology', '🧬', 'Aiming for A* in triple science.'),
  ('Hamza R.', 'Edexcel A-Level', 4310, 720, 890, 11, 21, 'Past papers all week', '📝', 'Maths and physics grinder.'),
  ('Leila T.', 'IB Diploma', 3970, 510, 1030, 10, 45, 'Deep work mode', '🎧', 'Chemistry HL, loves the lab.'),
  ('Noah K.', 'AQA GCSE', 3120, 480, 610, 9, 15, 'Streak hunting', '🔥', 'Trying to hit a 60-day streak.'),
  ('Ifeoma A.', 'Cambridge A-Level', 2760, 390, 720, 8, 27, 'Quiz champion', '🏆', 'Biology and chemistry.'),
  ('Sana P.', 'Edexcel IGCSE', 2140, 300, 430, 7, 9, 'Back from a break', '🌱', 'Rebuilding my study habit.')
) AS p(display_name, board, xp, xp_week, lab_xp, level, streak, status, emoji, bio)
WHERE NOT EXISTS (SELECT 1 FROM public.profiles x WHERE x.display_name = p.display_name);
