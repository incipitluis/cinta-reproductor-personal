'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePlayer } from '@/components/PlayerContext';
import SourceBadge from '@/components/SourceBadge';
import EqBars from '@/components/EqBars';
import type { Source, Track } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

// ─── Albums tab ──────────────────────────────────────────────────────────────

interface AlbumRow {
  album: string;
  artist: string | null;
  release_year: number | null;
  source: Source;
  track_count: number;
}

function AlbumsTab() {
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [loose, setLoose] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from('tracks')
      .select('album, artist, release_year, source')
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        const map = new Map<string, AlbumRow>();
        let looseCount = 0;

        for (const row of data) {
          if (!row.album) { looseCount++; continue; }
          const key = `${row.album}::${row.artist}`;
          if (!map.has(key)) {
            map.set(key, { album: row.album, artist: row.artist, release_year: row.release_year, source: row.source, track_count: 0 });
          }
          map.get(key)!.track_count++;
        }

        setAlbums(Array.from(map.values()));
        setLoose(looseCount);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ fontSize: '11px', color: '#444' }}>cargando…</p>;

  if (albums.length === 0 && loose === 0) {
    return (
      <p style={{ fontSize: '12px', color: '#444', fontStyle: 'italic', fontFamily: 'var(--font-instrument-serif), serif' }}>
        sube archivos o añade tracks para ver álbumes aquí
      </p>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
        {albums.map((a) => (
          <AlbumCard key={`${a.album}-${a.artist}`} album={a} />
        ))}

        {loose > 0 && (
          <div style={{
            cursor: 'default',
            opacity: 0.6,
          }}>
            <div style={{
              width: '100%', aspectRatio: '1',
              background: 'linear-gradient(135deg, #1a1a1f, #1f1f28)',
              borderRadius: '4px', marginBottom: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px dashed rgba(255,255,255,0.07)',
            }}>
              <span style={{ fontSize: '11px', color: '#444' }}>{loose} sin álbum</span>
            </div>
            <div style={{ fontSize: '11px', color: '#555' }}>canciones sueltas</div>
          </div>
        )}
      </div>
    </>
  );
}

function AlbumCard({ album }: { album: AlbumRow }) {
  return (
    <div
      style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
    >
      <div style={{
        width: '100%', aspectRatio: '1',
        background: 'linear-gradient(135deg, #1a1a20, #252530)',
        borderRadius: '4px', marginBottom: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.05)',
        position: 'relative', overflow: 'hidden',
      }}>
        <span style={{
          fontFamily: 'var(--font-instrument-serif), serif',
          fontSize: '32px', color: 'rgba(255,255,255,0.08)',
          fontStyle: 'italic', userSelect: 'none',
        }}>
          {album.album.charAt(0)}
        </span>
        <div style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
          <SourceBadge source={album.source} />
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {album.album}
      </div>
      <div style={{ fontSize: '10px', color: '#555' }}>
        {album.artist ?? '—'}
        {album.release_year ? ` · ${album.release_year}` : ''}
        {` · ${album.track_count} tema${album.track_count !== 1 ? 's' : ''}`}
      </div>
    </div>
  );
}

// ─── Songs tab ───────────────────────────────────────────────────────────────

function SongsTab() {
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from('tracks')
      .select('*')
      .order('artist', { ascending: true, nullsFirst: false })
      .order('title', { ascending: true })
      .then(({ data }) => {
        setTracks(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ fontSize: '11px', color: '#444' }}>cargando…</p>;

  if (!tracks.length) {
    return (
      <p style={{ fontSize: '12px', color: '#444', fontStyle: 'italic', fontFamily: 'var(--font-instrument-serif), serif' }}>
        no hay canciones en tu biblioteca todavía
      </p>
    );
  }

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 60px 50px',
        gap: '12px', padding: '0 8px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px',
      }}>
        {(['título', 'álbum', 'fuente', 'dur.'] as const).map((h, i) => (
          <span key={h} style={{ fontSize: '8px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: i === 3 ? 'right' : 'left' }}>
            {h}
          </span>
        ))}
      </div>

      {tracks.map((track, i) => {
        const active = currentTrack?.id === track.id;
        return (
          <div
            key={track.id}
            onClick={() => playTrack(track, tracks, i)}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 60px 50px',
              gap: '12px', padding: '9px 8px',
              borderRadius: '4px', cursor: 'pointer',
              background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
              alignItems: 'center', transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <div>
              <div style={{ fontSize: '12px', color: active ? '#e8e4df' : '#aaa', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {active && <EqBars playing={isPlaying} />}
                {track.title}
              </div>
              <div style={{ fontSize: '10px', color: '#555' }}>{track.artist ?? '—'}</div>
            </div>
            <span style={{ fontSize: '11px', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {track.album ?? '—'}
            </span>
            <SourceBadge source={track.source} />
            <span style={{ fontSize: '11px', color: '#444', textAlign: 'right' }}>{formatDuration(track.duration)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

type LibTab = 'albumes' | 'canciones';

export default function LibraryView() {
  const [tab, setTab] = useState<LibTab>('canciones');

  const tabBtn = (id: LibTab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        fontSize: '10px', padding: '5px 14px', borderRadius: '3px',
        border: `1px solid ${tab === id ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}`,
        background: tab === id ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: tab === id ? '#e8e4df' : '#555',
        cursor: 'pointer', transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="animate-slide-up" style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
        {tabBtn('canciones', 'canciones')}
        {tabBtn('albumes',   'álbumes')}
      </div>

      {tab === 'canciones' && <SongsTab />}
      {tab === 'albumes'   && <AlbumsTab />}
    </div>
  );
}
