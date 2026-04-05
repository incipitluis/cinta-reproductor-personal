'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePlayer } from '@/components/PlayerContext';
import SourceBadge from '@/components/SourceBadge';
import EqBars from '@/components/EqBars';
import type { Playlist, Track } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

interface Props {
  playlistId: string | null;
}

export default function PlaylistView({ playlistId }: Props) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playlistId) {
      setPlaylist(null);
      setTracks([]);
      return;
    }

    const supabase = createClient();
    setLoading(true);

    Promise.all([
      supabase.from('playlists').select('*').eq('id', playlistId).single(),
      supabase
        .from('playlist_tracks')
        .select('position, track:tracks(*)')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true }),
    ]).then(([plRes, ptRes]) => {
      if (plRes.data) setPlaylist(plRes.data);
      if (ptRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = (ptRes.data as any[])
          .map((row) => row.track as Track | null)
          .filter((t): t is Track => t !== null);
        setTracks(t);
      }
      setLoading(false);
    });
  }, [playlistId]);

  if (!playlistId) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#333',
          fontSize: '12px',
          fontStyle: 'italic',
          fontFamily: 'var(--font-instrument-serif), serif',
        }}
      >
        selecciona una lista
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '28px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '36px',
            fontWeight: 400,
            color: '#e8e4df',
            letterSpacing: '-0.02em',
          }}
        >
          {playlist?.name ?? '…'}
        </h2>
        <span style={{ fontSize: '11px', color: '#555' }}>
          {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
        </span>
      </div>

      {loading && (
        <p style={{ fontSize: '11px', color: '#444' }}>cargando…</p>
      )}

      {!loading && tracks.length === 0 && (
        <p
          style={{
            fontSize: '12px',
            color: '#444',
            fontStyle: 'italic',
            fontFamily: 'var(--font-instrument-serif), serif',
          }}
        >
          lista vacía
        </p>
      )}

      {tracks.length > 0 && (
        <div>
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 1fr 60px 50px',
              gap: '12px',
              padding: '0 8px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '4px',
            }}
          >
            {['#', 'título', 'álbum', 'fuente', 'dur.'].map((h, i) => (
              <span
                key={h}
                style={{
                  fontSize: '8px',
                  color: '#444',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textAlign: i === 4 ? 'right' : 'left',
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {tracks.map((track, i) => {
            const active = currentTrack?.id === track.id;
            return (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                active={active}
                playing={active && isPlaying}
                onClick={() => playTrack(track, tracks, i)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrackRow({
  track,
  index,
  active,
  playing,
  onClick,
}: {
  track: Track;
  index: number;
  active: boolean;
  playing: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 1fr 60px 50px',
        gap: '12px',
        padding: '9px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        alignItems: 'center',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {/* Index / EqBars */}
      <span style={{ fontSize: '11px', color: active ? '#e8e4df' : '#444', width: '32px' }}>
        {active ? <EqBars playing={playing} /> : String(index + 1).padStart(2, '0')}
      </span>

      {/* Title + artist */}
      <div>
        <div
          style={{
            fontSize: '12px',
            color: active ? '#e8e4df' : '#aaa',
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {track.title}
        </div>
        <div style={{ fontSize: '10px', color: '#555' }}>{track.artist ?? '—'}</div>
      </div>

      {/* Album */}
      <span
        style={{
          fontSize: '11px',
          color: '#444',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {track.album ?? '—'}
      </span>

      {/* Source */}
      <SourceBadge source={track.source} />

      {/* Duration */}
      <span style={{ fontSize: '11px', color: '#444', textAlign: 'right' }}>
        {formatDuration(track.duration)}
      </span>
    </div>
  );
}
