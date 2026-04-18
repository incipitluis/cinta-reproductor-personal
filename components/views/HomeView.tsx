'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePlayer } from '@/components/PlayerContext';
import SourceBadge from '@/components/SourceBadge';
import type { Track } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

interface Stats { total: number; albums: number; artists: number }

function TrackRow({ track, index, queue }: { track: Track; index: number; queue: Track[] }) {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const active = currentTrack?.id === track.id;

  return (
    <div
      onClick={() => playTrack(track, queue, index)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '7px 10px',
        borderRadius: '4px',
        cursor: 'pointer',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <div style={{
        width: '32px', height: '32px', borderRadius: '3px',
        background: 'linear-gradient(135deg, #1a1a20, #252530)',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        fontSize: '13px', color: active && isPlaying ? '#b8c4a0' : 'rgba(255,255,255,0.1)',
        fontFamily: 'var(--font-instrument-serif), serif', fontStyle: 'italic',
      }}>
        {track.title.charAt(0)}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '12px', color: active ? '#e8e4df' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.title}
        </div>
        <div style={{ fontSize: '10px', color: '#555' }}>{track.artist ?? '—'}</div>
      </div>
      <SourceBadge source={track.source} />
      <span style={{ fontSize: '11px', color: '#444', flexShrink: 0, width: '36px', textAlign: 'right' }}>
        {formatDuration(track.duration)}
      </span>
    </div>
  );
}

function Section({ label, tracks }: { label: string; tracks: Track[] }) {
  if (!tracks.length) return null;
  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: '12px' }}>
        {label}
      </div>
      {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} queue={tracks} />)}
    </div>
  );
}

export default function HomeView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPlayed, setRecentPlayed] = useState<Track[]>([]);
  const [recentAdded, setRecentAdded] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('tracks').select('artist, album', { count: 'exact', head: false }),
      supabase.from('tracks').select('*').not('last_played_at', 'is', null).order('last_played_at', { ascending: false }).limit(5),
      supabase.from('tracks').select('*').order('created_at', { ascending: false }).limit(5),
    ]).then(([statsRes, playedRes, addedRes]) => {
      if (statsRes.data) {
        const artists = new Set(statsRes.data.map((t) => t.artist).filter(Boolean));
        const albums  = new Set(statsRes.data.map((t) => t.album).filter(Boolean));
        setStats({ total: statsRes.count ?? statsRes.data.length, albums: albums.size, artists: artists.size });
      }
      setRecentPlayed(playedRes.data ?? []);

      const playedIds = new Set((playedRes.data ?? []).map((t) => t.id));
      setRecentAdded((addedRes.data ?? []).filter((t) => !playedIds.has(t.id)));
      setLoading(false);
    });
  }, []);

  return (
    <div className="animate-slide-up" style={{ padding: '28px 32px' }}>
      <h2 style={{
        fontFamily: 'var(--font-instrument-serif), serif',
        fontSize: '36px', fontWeight: 400,
        color: '#e8e4df', letterSpacing: '-0.02em', marginBottom: '28px',
      }}>
        inicio
      </h2>

      {stats && (
        <div style={{ display: 'flex', gap: '36px', marginBottom: '40px', paddingBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {([
            [stats.total, 'canciones'],
            [stats.albums, 'álbumes'],
            [stats.artists, 'artistas'],
          ] as [number, string][]).map(([value, label]) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: '32px', fontWeight: 400, color: '#e8e4df', lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.08em', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          <Section label="escuchado recientemente" tracks={recentPlayed} />
          <Section label="añadido recientemente"   tracks={recentAdded} />
          {recentPlayed.length === 0 && recentAdded.length === 0 && (
            <p style={{ fontSize: '12px', color: '#333', fontStyle: 'italic', fontFamily: 'var(--font-instrument-serif), serif' }}>
              sube música para empezar
            </p>
          )}
        </>
      )}
    </div>
  );
}
