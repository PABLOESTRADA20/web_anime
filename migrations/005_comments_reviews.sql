CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL DEFAULT '',
  anilist_id INTEGER NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'anime' CHECK(media_type IN ('anime', 'manga')),
  content TEXT NOT NULL CHECK(length(content) >= 1 AND length(content) <= 2000),
  rating INTEGER CHECK(rating >= 1 AND rating <= 10),
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  episode_number INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_anime ON comments(anilist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_episode ON comments(anilist_id, episode_number);

CREATE TABLE IF NOT EXISTS comment_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, comment_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);

CREATE TABLE IF NOT EXISTS comment_rate_limits (
  user_id TEXT PRIMARY KEY,
  last_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL DEFAULT '',
  anilist_id INTEGER NOT NULL,
  media_type TEXT DEFAULT 'anime' CHECK(media_type IN ('anime', 'manga')),
  score INTEGER NOT NULL CHECK(score >= 1 AND score <= 10),
  content TEXT NOT NULL CHECK(length(content) >= 10 AND length(content) <= 5000),
  has_spoilers INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, anilist_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_anime ON reviews(anilist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_recent ON reviews(created_at DESC);

CREATE TABLE IF NOT EXISTS review_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK(vote IN (1, -1)),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, review_id)
);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);
