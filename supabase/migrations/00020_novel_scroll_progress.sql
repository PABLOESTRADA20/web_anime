-- Add scroll progress tracking to novel history
ALTER TABLE IF EXISTS public.novel_history
  ADD COLUMN IF NOT EXISTS scroll_percent REAL DEFAULT 0;
