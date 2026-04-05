-- Cinta — personal music player schema
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS tracks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  artist      TEXT,
  album       TEXT,
  release_year INTEGER,
  duration    FLOAT,          -- seconds
  cover_url   TEXT,
  source      TEXT NOT NULL CHECK (source IN ('local', 'soundcloud', 'fma')),
  source_ref  TEXT NOT NULL,  -- storage path (local), SC URL (soundcloud), MP3 URL (fma)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlists (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  cover      TEXT,            -- emoji or short identifier
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id    UUID REFERENCES tracks(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (playlist_id, track_id)
);

-- Enable RLS (single-user app — allow all for now)
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_tracks"          ON tracks          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_playlists"       ON playlists       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_playlist_tracks" ON playlist_tracks FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for local audio files
-- Run via Supabase dashboard or API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('music', 'music', true);
