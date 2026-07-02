-- Novel ratings
CREATE TABLE IF NOT EXISTS public.novel_ratings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_slug TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_novel_ratings_slug ON public.novel_ratings(novel_slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_novel_ratings_unique ON public.novel_ratings(user_id, novel_slug);

ALTER TABLE public.novel_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Novel ratings are public"
  ON public.novel_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own novel ratings"
  ON public.novel_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own novel ratings"
  ON public.novel_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own novel ratings"
  ON public.novel_ratings FOR DELETE
  USING (auth.uid() = user_id);
