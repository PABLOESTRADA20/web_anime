CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_public INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);

CREATE TABLE IF NOT EXISTS collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  anilist_id INTEGER NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'anime' CHECK(media_type IN ('anime', 'manga')),
  note TEXT DEFAULT '',
  added_at TEXT DEFAULT (datetime('now')),
  UNIQUE(collection_id, anilist_id, media_type)
);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id);
