CREATE TABLE IF NOT EXISTS manga_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  anilist_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  image TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, anilist_id)
);
CREATE INDEX IF NOT EXISTS idx_manga_favorites_user ON manga_favorites(user_id);

CREATE TABLE IF NOT EXISTS manga_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  anilist_id INTEGER NOT NULL,
  chapter_number REAL NOT NULL,
  chapter_id TEXT NOT NULL,
  title TEXT,
  image TEXT,
  page INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, anilist_id, chapter_number)
);
CREATE INDEX IF NOT EXISTS idx_manga_history_user ON manga_history(user_id);
CREATE INDEX IF NOT EXISTS idx_manga_history_anime ON manga_history(user_id, anilist_id);

CREATE TABLE IF NOT EXISTS manga_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  anilist_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  image TEXT,
  status TEXT NOT NULL CHECK(status IN ('reading', 'completed', 'plan_to_read')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, anilist_id)
);
CREATE INDEX IF NOT EXISTS idx_manga_lists_user ON manga_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_manga_lists_status ON manga_lists(status);
