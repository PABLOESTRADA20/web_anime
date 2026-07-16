CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY,
  new_episode INTEGER NOT NULL DEFAULT 1,
  new_review INTEGER NOT NULL DEFAULT 1,
  comment_reply INTEGER NOT NULL DEFAULT 1,
  review_vote INTEGER NOT NULL DEFAULT 1,
  weekly_digest INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_users_user ON admin_users(user_id);

CREATE TABLE IF NOT EXISTS community_episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anilist_id INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT DEFAULT '',
  url TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'latam' CHECK(language IN ('sub', 'dub', 'latam')),
  submitted_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(anilist_id, episode_number, url)
);
CREATE INDEX IF NOT EXISTS idx_community_episodes_anime ON community_episodes(anilist_id, status);
CREATE INDEX IF NOT EXISTS idx_community_episodes_status ON community_episodes(status);

CREATE TABLE IF NOT EXISTS community_episode_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  episode_id INTEGER NOT NULL REFERENCES community_episodes(id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK(vote IN (1, -1)),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, episode_id)
);
CREATE INDEX IF NOT EXISTS idx_community_episode_votes_episode ON community_episode_votes(episode_id);

CREATE TABLE IF NOT EXISTS community_manga_chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anilist_id INTEGER NOT NULL,
  chapter_number REAL NOT NULL,
  title TEXT DEFAULT '',
  url TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  submitted_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(anilist_id, chapter_number, url)
);
CREATE INDEX IF NOT EXISTS idx_community_manga_anime ON community_manga_chapters(anilist_id, status);
CREATE INDEX IF NOT EXISTS idx_community_manga_status ON community_manga_chapters(status);

CREATE TABLE IF NOT EXISTS community_manga_chapter_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  chapter_id INTEGER NOT NULL REFERENCES community_manga_chapters(id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK(vote IN (1, -1)),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, chapter_id)
);
CREATE INDEX IF NOT EXISTS idx_community_manga_votes_chapter ON community_manga_chapter_votes(chapter_id);

CREATE TABLE IF NOT EXISTS community_novel_chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  novel_slug TEXT NOT NULL,
  chapter_number REAL NOT NULL,
  title TEXT DEFAULT '',
  url TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  submitted_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(novel_slug, chapter_number, url)
);
CREATE INDEX IF NOT EXISTS idx_community_novel_slug ON community_novel_chapters(novel_slug, status);
CREATE INDEX IF NOT EXISTS idx_community_novel_status ON community_novel_chapters(status);

CREATE TABLE IF NOT EXISTS community_novel_chapter_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  chapter_id INTEGER NOT NULL REFERENCES community_novel_chapters(id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK(vote IN (1, -1)),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, chapter_id)
);
CREATE INDEX IF NOT EXISTS idx_community_novel_votes_chapter ON community_novel_chapter_votes(chapter_id);
