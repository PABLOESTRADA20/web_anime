-- Rate limiting for comments: max 1 comment per 10 seconds per user
CREATE TABLE IF NOT EXISTS public.comment_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.check_comment_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.comment_rate_limits
    WHERE user_id = NEW.user_id
    AND last_at > NOW() - INTERVAL '10 seconds'
  ) THEN
    RAISE EXCEPTION 'rate_limit: Please wait a few seconds before posting again'
      USING HINT = 'rate_limit_exceeded';
  END IF;

  INSERT INTO public.comment_rate_limits (user_id, last_at)
  VALUES (NEW.user_id, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET last_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_comment_rate_limit ON public.comments;
CREATE TRIGGER trg_check_comment_rate_limit
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_comment_rate_limit();
