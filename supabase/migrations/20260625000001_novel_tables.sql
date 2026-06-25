-- Novel tables for tracking reading progress, favorites, and custom lists
-- Run this in the Supabase SQL editor

-- Novel history (reading progress)
CREATE TABLE IF NOT EXISTS public.novel_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_slug TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT DEFAULT '',
  novel_title TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_novel_history_user ON public.novel_history(user_id);
CREATE INDEX IF NOT EXISTS idx_novel_history_slug ON public.novel_history(novel_slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_novel_history_unique ON public.novel_history(user_id, novel_slug, chapter_number);

ALTER TABLE public.novel_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own novel history"
  ON public.novel_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own novel history"
  ON public.novel_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own novel history"
  ON public.novel_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Novel favorites
CREATE TABLE IF NOT EXISTS public.novel_favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_slug TEXT NOT NULL,
  title TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_novel_favorites_user ON public.novel_favorites(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_novel_favorites_unique ON public.novel_favorites(user_id, novel_slug);

ALTER TABLE public.novel_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own novel favorites"
  ON public.novel_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own novel favorites"
  ON public.novel_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own novel favorites"
  ON public.novel_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Novel lists (Reading, Completed, On Hold, Dropped, Plan to Read)
CREATE TABLE IF NOT EXISTS public.novel_lists (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_slug TEXT NOT NULL,
  title TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('Leyendo', 'Completado', 'Pendiente', 'Abandonado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_novel_lists_user ON public.novel_lists(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_novel_lists_unique ON public.novel_lists(user_id, novel_slug);

ALTER TABLE public.novel_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own novel lists"
  ON public.novel_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own novel lists"
  ON public.novel_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own novel lists"
  ON public.novel_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own novel lists"
  ON public.novel_lists FOR DELETE
  USING (auth.uid() = user_id);
