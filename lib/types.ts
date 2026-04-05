export type Source = 'local' | 'soundcloud' | 'fma';

export interface Track {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  release_year?: number;
  duration?: number; // seconds
  cover_url?: string;
  source: Source;
  source_ref: string;
  created_at?: string;
}

export interface Playlist {
  id: string;
  name: string;
  cover?: string;
  created_at?: string;
  track_count?: number;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  position: number;
  track?: Track;
}
