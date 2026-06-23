ALTER TABLE public.comments
ADD COLUMN episode_number INT;

CREATE INDEX IF NOT EXISTS idx_comments_episode ON public.comments(anilist_id, episode_number);
