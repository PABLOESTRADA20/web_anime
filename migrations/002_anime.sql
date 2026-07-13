CREATE TABLE IF NOT EXISTS anime_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  anilist_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  image TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, anilist_id)
);
CREATE INDEX IF NOT EXISTS idx_anime_favorites_user ON anime_favorites(user_id);

CREATE TABLE IF NOT EXISTS anime_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  anilist_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, anilist_id)
);
CREATE INDEX IF NOT EXISTS idx_anime_ratings_anime ON anime_ratings(anilist_id);

CREATE TABLE IF NOT EXISTS anime_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  anilist_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  image TEXT,
  status TEXT NOT NULL CHECK(status IN ('watching', 'completed', 'plan_to_watch')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, anilist_id)
);
CREATE INDEX IF NOT EXISTS idx_anime_lists_user ON anime_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_anime_lists_status ON anime_lists(status);
