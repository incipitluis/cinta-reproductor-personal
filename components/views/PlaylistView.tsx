'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePlayer } from '@/components/PlayerContext';
import SourceBadge from '@/components/SourceBadge';
import EqBars from '@/components/EqBars';
import type { Playlist, Track } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

interface PlaylistItem { pt_id: string; position: number; track: Track }

// ─── Add tracks modal ────────────────────────────────────────────────────────

function AddTracksModal({
  playlistId,
  existingIds,
  nextPosition,
  onAdd,
  onClose,
}: {
  playlistId: string;
  existingIds: Set<string>;
  nextPosition: number;
  onAdd: (item: PlaylistItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      let builder = supabase.from('tracks').select('*');
      if (query.trim()) {
        builder = builder.or(`title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`);
      } else {
        builder = builder.order('artist', { ascending: true, nullsFirst: false }).order('title', { ascending: true });
      }
      const { data } = await builder.limit(50);
      setResults(data ?? []);
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const addTrack = async (track: Track) => {
    if (existingIds.has(track.id) || added.has(track.id)) return;
    const pos = nextPosition + added.size;
    const { data, error } = await createClient()
      .from('playlist_tracks')
      .insert({ playlist_id: playlistId, track_id: track.id, position: pos })
      .select('id')
      .single();
    if (!error && data) {
      setAdded((prev) => new Set([...prev, track.id]));
      onAdd({ pt_id: data.id, position: pos, track });
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '480px', maxHeight: '70vh', background: '#16161c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '11px', color: '#888', letterSpacing: '0.05em' }}>añadir canciones</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0' }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="buscar en tu biblioteca…"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px', padding: '8px 12px', color: '#e8e4df', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.map((track) => {
            const inList  = existingIds.has(track.id);
            const justAdded = added.has(track.id);
            const done = inList || justAdded;
            return (
              <div
                key={track.id}
                onClick={() => !done && addTrack(track)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '9px 20px', cursor: done ? 'default' : 'pointer',
                  opacity: inList ? 0.35 : 1,
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={(e) => { if (!done) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                  <div style={{ fontSize: '10px', color: '#555' }}>{track.artist ?? '—'}{track.album ? ` · ${track.album}` : ''}</div>
                </div>
                <span style={{ fontSize: '10px', color: justAdded ? '#b8c4a0' : '#444', flexShrink: 0 }}>
                  {justAdded ? '✓' : inList ? 'ya añadida' : '+ añadir'}
                </span>
              </div>
            );
          })}
          {results.length === 0 && (
            <p style={{ fontSize: '11px', color: '#444', textAlign: 'center', padding: '32px 20px' }}>sin resultados</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

interface Props { playlistId: string | null }

export default function PlaylistView({ playlistId }: Props) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [hoveredPt, setHoveredPt] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!playlistId) { setPlaylist(null); setItems([]); return; }
    const supabase = createClient();
    setLoading(true);
    Promise.all([
      supabase.from('playlists').select('*').eq('id', playlistId).single(),
      supabase.from('playlist_tracks').select('id, position, track:tracks(*)').eq('playlist_id', playlistId).order('position', { ascending: true }),
    ]).then(([plRes, ptRes]) => {
      if (plRes.data) setPlaylist(plRes.data);
      if (ptRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = (ptRes.data as any[])
          .map((row) => ({ pt_id: row.id as string, position: row.position as number, track: row.track as Track | null }))
          .filter((r): r is PlaylistItem => r.track !== null);
        setItems(parsed);
      }
      setLoading(false);
    });
  }, [playlistId]);

  const removeTrack = useCallback(async (ptId: string) => {
    setItems((prev) => prev.filter((i) => i.pt_id !== ptId));
    await createClient().from('playlist_tracks').delete().eq('id', ptId);
  }, []);

  const handleDrop = useCallback(async (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(toIndex, 0, moved);
      const updated = next.map((item, i) => ({ ...item, position: i }));
      const supabase = createClient();
      Promise.all(updated.map((item) =>
        supabase.from('playlist_tracks').update({ position: item.position }).eq('id', item.pt_id)
      ));
      return updated;
    });
  }, [dragIndex]);

  const totalDuration = items.reduce((s, i) => s + (i.track.duration ?? 0), 0);
  const totalMin = Math.round(totalDuration / 60);

  if (!playlistId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333', fontSize: '12px', fontStyle: 'italic', fontFamily: 'var(--font-instrument-serif), serif' }}>
        selecciona una lista
      </div>
    );
  }

  const tracks = items.map((i) => i.track);

  return (
    <div className="animate-slide-up" style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: '22px', fontWeight: 400, color: '#e8e4df', letterSpacing: '-0.01em', marginBottom: '4px' }}>
            {playlist?.name ?? '…'}
          </div>
          {!loading && (
            <div style={{ fontSize: '10px', color: '#555' }}>
              {items.length} {items.length === 1 ? 'canción' : 'canciones'}{totalMin > 0 ? ` · ${totalMin} min` : ''}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ fontSize: '10px', padding: '7px 14px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#888', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#e8e4df'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#888'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
        >
          + añadir canciones
        </button>
      </div>

      {loading && <p style={{ fontSize: '11px', color: '#444' }}>cargando…</p>}

      {!loading && items.length === 0 && (
        <p style={{ fontSize: '12px', color: '#444', fontStyle: 'italic', fontFamily: 'var(--font-instrument-serif), serif' }}>
          lista vacía — añade canciones con el botón de arriba
        </p>
      )}

      {items.length > 0 && (
        <div>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '20px 28px 1fr 100px 60px 44px 24px', gap: '10px', padding: '0 8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
            {['', '#', 'título', 'álbum', 'fuente', 'dur.', ''].map((h, i) => (
              <span key={i} style={{ fontSize: '8px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: i === 5 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {items.map((item, i) => {
            const active = currentTrack?.id === item.track.id;
            const isOver = dragOverIndex === i;
            return (
              <div
                key={item.pt_id}
                draggable
                onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(i); setDragOverIndex(null); }}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                onMouseEnter={() => setHoveredPt(item.pt_id)}
                onMouseLeave={() => setHoveredPt(null)}
                onClick={() => playTrack(item.track, tracks, i)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 28px 1fr 100px 60px 44px 24px',
                  gap: '10px', padding: '8px 8px',
                  borderRadius: '4px', cursor: 'pointer',
                  alignItems: 'center',
                  background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderTop: isOver ? '2px solid rgba(184,196,160,0.35)' : '2px solid transparent',
                  transition: 'background 0.1s ease',
                  userSelect: 'none',
                }}
                onMouseOver={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseOut={(e)  => { if (!active) (e.currentTarget as HTMLDivElement).style.background = active ? 'rgba(255,255,255,0.05)' : 'transparent'; }}
              >
                {/* Drag handle */}
                <span style={{ color: '#333', fontSize: '11px', cursor: 'grab', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>⠿</span>

                {/* Index / EqBars */}
                <span style={{ fontSize: '11px', color: active ? '#e8e4df' : '#444' }}>
                  {active ? <EqBars playing={isPlaying} /> : String(i + 1).padStart(2, '0')}
                </span>

                {/* Title + artist */}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', color: active ? '#e8e4df' : '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.track.title}</div>
                  <div style={{ fontSize: '10px', color: '#555' }}>{item.track.artist ?? '—'}</div>
                </div>

                {/* Album */}
                <span style={{ fontSize: '11px', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.track.album ?? '—'}</span>

                {/* Source */}
                <SourceBadge source={item.track.source} />

                {/* Duration */}
                <span style={{ fontSize: '11px', color: '#444', textAlign: 'right' }}>{formatDuration(item.track.duration)}</span>

                {/* Remove */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeTrack(item.pt_id); }}
                  style={{
                    background: 'none', border: 'none', color: '#555', cursor: 'pointer',
                    fontSize: '14px', lineHeight: 1, padding: '0',
                    opacity: hoveredPt === item.pt_id ? 1 : 0,
                    transition: 'opacity 0.1s ease',
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && playlistId && (
        <AddTracksModal
          playlistId={playlistId}
          existingIds={new Set(items.map((i) => i.track.id))}
          nextPosition={items.length}
          onAdd={(item) => setItems((prev) => [...prev, item])}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
