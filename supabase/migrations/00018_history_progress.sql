ALTER TABLE public.history
  ADD COLUMN IF NOT EXISTS progress REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration REAL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_history_progress ON public.history(user_id, updated_at DESC);
