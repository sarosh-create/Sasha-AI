ALTER TABLE public.study_rooms ALTER COLUMN max_participants SET DEFAULT 100;
UPDATE public.study_rooms SET max_participants = 100 WHERE max_participants = 4;