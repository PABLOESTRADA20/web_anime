CREATE TABLE IF NOT EXISTS novel_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  novel_slug TEXT NOT NULL,
  title TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_novel_favorites_user ON novel_favorites(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_novel_favorites_unique ON novel_favorites(user_id, novel_slug);

CREATE TABLE IF NOT EXISTS novel_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  novel_slug TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT DEFAULT '',
  novel_title TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  scroll_percent REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_novel_history_user ON novel_history(user_id);
CREATE INDEX IF NOT EXISTS idx_novel_history_slug ON novel_history(novel_slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_novel_history_unique ON novel_history(user_id, novel_slug, chapter_number);

CREATE TABLE IF NOT EXISTS novel_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  novel_slug TEXT NOT NULL,
  title TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('Leyendo', 'Completado', 'Pendiente', 'Abandonado')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_novel_lists_user ON novel_lists(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_novel_lists_unique ON novel_lists(user_id, novel_slug);

CREATE TABLE IF NOT EXISTS novel_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  novel_slug TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_novel_ratings_slug ON novel_ratings(novel_slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_novel_ratings_unique ON novel_ratings(user_id, novel_slug);
