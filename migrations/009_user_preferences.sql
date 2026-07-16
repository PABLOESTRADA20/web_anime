ALTER TABLE user_profiles ADD COLUMN preferred_audio TEXT NOT NULL DEFAULT 'sub';
ALTER TABLE user_profiles ADD COLUMN preferred_subtitle_lang TEXT NOT NULL DEFAULT 'es';
