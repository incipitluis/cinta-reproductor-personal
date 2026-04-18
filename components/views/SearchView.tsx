'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePlayer } from '@/components/PlayerContext';
import SourceBadge from '@/components/SourceBadge';
import EqBars from '@/components/EqBars';
import type { Source, Track } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

type Filter = 'all' | Source;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',        label: 'todo' },
  { id: 'local',      label: 'local' },
  { id: 'soundcloud', label: 'soundcloud' },
  { id: 'fma',        label: 'free music archive' },
];

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="10" cy="10" r="7" />
      <line x1="15" y1="15" x2="21" y2="21" />
    </svg>
  );
}

export default function SearchView() {
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<Track[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    createClient()
      .from('tracks')
      .select('*')
      .not('last_played_at', 'is', null)
      .order('last_played_at', { ascending: false })
      .limit(8)
      .then(({ data }) => setRecents(data ?? []));
  }, []);

  const search = useCallback(
    (q: string, f: Filter) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      const supabase = createClient();

      let builder = supabase
        .from('tracks')
        .select('*')
        .or(`title.ilike.%${q}%,artist.ilike.%${q}%,album.ilike.%${q}%`)
        .order('title', { ascending: true })
        .limit(50);

      if (f !== 'all') {
        builder = builder.eq('source', f);
      }

      builder.then(({ data }) => {
        setResults(data ?? []);
        setLoading(false);
      });
    },
    [],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query, filter), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filter, search]);

  return (
    <div className="animate-slide-up" style={{ padding: '28px 32px' }}>
      {/* Search input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          padding: '10px 14px',
          border: '1px solid rgba(255,255,255,0.07)',
          marginBottom: '16px',
          color: '#666',
        }}
      >
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="artista, título, álbum…"
          autoFocus
          style={{
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#e8e4df',
            fontSize: '12px',
            width: '100%',
          }}
        />
      </div>

      {/* Source filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              fontSize: '10px',
              padding: '5px 12px',
              borderRadius: '3px',
              border: `1px solid ${filter === f.id ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}`,
              background: filter === f.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: filter === f.id ? '#e8e4df' : '#555',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && <p style={{ fontSize: '11px', color: '#444' }}>buscando…</p>}

      {!loading && query && results.length === 0 && (
        <p style={{ fontSize: '11px', color: '#444' }}>sin resultados</p>
      )}

      {!query && recents.length === 0 && (
        <p style={{ fontSize: '12px', color: '#333', textAlign: 'center', paddingTop: '48px' }}>
          escribe para buscar en tu biblioteca
        </p>
      )}

      {!query && recents.length > 0 && (
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: '12px' }}>
            escuchado recientemente
          </div>
          {recents.map((track, i) => {
            const active = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => playTrack(track, recents, i)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 60px 50px',
                  gap: '12px', padding: '9px 8px', borderRadius: '4px',
                  cursor: 'pointer', alignItems: 'center',
                  background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                  transition: 'background 0.15s ease',
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
      )}

      {results.length > 0 && (
        <div>
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 60px 50px',
              gap: '12px',
              padding: '0 8px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '4px',
            }}
          >
            {['título', 'álbum', 'fuente', 'dur.'].map((h, i) => (
              <span
                key={h}
                style={{
                  fontSize: '8px',
                  color: '#444',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textAlign: i === 3 ? 'right' : 'left',
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {results.map((track, i) => {
            const active = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => playTrack(track, results, i)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 60px 50px',
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
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: active ? '#e8e4df' : '#aaa',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {active && <EqBars playing={isPlaying} />}
                    {track.title}
                  </div>
                  <div style={{ fontSize: '10px', color: '#555' }}>{track.artist ?? '—'}</div>
                </div>
                <span style={{ fontSize: '11px', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.album ?? '—'}
                </span>
                <SourceBadge source={track.source} />
                <span style={{ fontSize: '11px', color: '#444', textAlign: 'right' }}>
                  {formatDuration(track.duration)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
