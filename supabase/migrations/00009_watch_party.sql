CREATE TABLE IF NOT EXISTS watch_party_participants (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anilist_id BIGINT NOT NULL,
  episode_number INT NOT NULL,
  room_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_party_room ON watch_party_participants(room_id);

ALTER TABLE watch_party_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see participants"
  ON watch_party_participants FOR SELECT USING (true);

CREATE POLICY "Users can join parties"
  ON watch_party_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave"
  ON watch_party_participants FOR DELETE USING (auth.uid() = user_id);

-- Add episode_number to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS episode_number INT;
CREATE INDEX IF NOT EXISTS idx_comments_episode ON comments(anilist_id, episode_number, created_at DESC);

-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT CHECK (char_length(bio) <= 500),
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are public"
  ON user_profiles FOR SELECT USING (true);

CREATE POLICY "Users can manage own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);
