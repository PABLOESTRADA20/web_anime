CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  anilist_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  image TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, anilist_id)
);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);

CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  anilist_id INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  episode_id TEXT NOT NULL,
  title TEXT,
  image TEXT,
  progress REAL DEFAULT 0,
  duration REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_anime ON history(user_id, anilist_id);
CREATE INDEX IF NOT EXISTS idx_history_progress ON history(user_id, updated_at DESC);
