'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePlayer } from '@/components/PlayerContext';
import AlbumCover from '@/components/AlbumCover';
import SourceBadge from '@/components/SourceBadge';
import EqBars from '@/components/EqBars';
import type { Source, Track } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

type LibTab = 'canciones' | 'albumes' | 'artistas';

// ─── Shared track list ────────────────────────────────────────────────────────

function TrackList({ tracks }: { tracks: Track[] }) {
  const { currentTrack, isPlaying, playTrack, addToQueue } = usePlayer();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div>
      <div className="track-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px 44px 24px', gap: '10px', padding: '0 8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
        <span style={{ fontSize: '8px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>título</span>
        <span className="track-grid-col-album" style={{ fontSize: '8px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>álbum</span>
        <span style={{ fontSize: '8px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>fuente</span>
        <span className="track-grid-col-dur" style={{ fontSize: '8px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right' }}>dur.</span>
        <span />
      </div>
      {tracks.map((track, i) => {
        const active = currentTrack?.id === track.id;
        return (
          <div
            key={track.id}
            className="track-grid"
            onMouseEnter={() => setHoveredId(track.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => playTrack(track, tracks, i)}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px 44px 24px', gap: '10px', padding: '9px 8px', borderRadius: '4px', cursor: 'pointer', alignItems: 'center', background: active ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'background 0.1s ease' }}
            onMouseOver={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseOut={(e)  => { if (!active) (e.currentTarget as HTMLDivElement).style.background = active ? 'rgba(255,255,255,0.05)' : 'transparent'; }}
          >
            <div>
              <div style={{ fontSize: '12px', color: active ? '#e8e4df' : '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {active && <EqBars playing={isPlaying} />}{track.title}
              </div>
              <div style={{ fontSize: '10px', color: '#555' }}>{track.artist ?? '—'}</div>
            </div>
            <span className="track-grid-col-album" style={{ fontSize: '11px', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.album ?? '—'}</span>
            <SourceBadge source={track.source} />
            <span className="track-grid-col-dur" style={{ fontSize: '11px', color: '#444', textAlign: 'right' }}>{formatDuration(track.duration)}</span>
            <button
              onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
              title="añadir a la cola"
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0, opacity: hoveredId === track.id ? 1 : 0, transition: 'opacity 0.1s ease' }}
            >+</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Back button ─────────────────────────────────────────────────────────────

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '11px', padding: '0 0 20px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.15s ease' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#aaa'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
    >
      ← {label}
    </button>
  );
}

// ─── Album detail ─────────────────────────────────────────────────────────────

function AlbumDetail({ album, artist, onBack }: { album: string; artist: string | null; onBack: () => void }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient().from('tracks').select('*').eq('album', album)
      .order('title', { ascending: true })
      .then(({ data }) => { setTracks(data ?? []); setLoading(false); });
  }, [album]);

  return (
    <div>
      <BackButton label="álbumes" onClick={onBack} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: '20px', fontWeight: 400, color: '#e8e4df', letterSpacing: '-0.01em' }}>{album}</div>
        {artist && <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{artist}</div>}
      </div>
      {loading ? <p style={{ fontSize: '11px', color: '#444' }}>cargando…</p> : <TrackList tracks={tracks} />}
    </div>
  );
}

// ─── Artist detail ────────────────────────────────────────────────────────────

interface AlbumGroup { album: string; release_year: number | null; source: Source; tracks: Track[] }

function ArtistDetail({ name, onBack }: { name: string; onBack: () => void }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient().from('tracks').select('*').eq('artist', name)
      .order('album', { ascending: true, nullsFirst: false })
      .order('title', { ascending: true })
      .then(({ data }) => { setTracks(data ?? []); setLoading(false); });
  }, [name]);

  const albumMap = new Map<string, AlbumGroup>();
  const loose: Track[] = [];
  for (const t of tracks) {
    if (!t.album) { loose.push(t); continue; }
    if (!albumMap.has(t.album)) albumMap.set(t.album, { album: t.album, release_year: t.release_year ?? null, source: t.source, tracks: [] });
    albumMap.get(t.album)!.tracks.push(t);
  }
  const albums = Array.from(albumMap.values());

  return (
    <div>
      <BackButton label="artistas" onClick={onBack} />
      <div style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: '20px', fontWeight: 400, color: '#e8e4df', marginBottom: '24px', letterSpacing: '-0.01em' }}>{name}</div>

      {loading && <p style={{ fontSize: '11px', color: '#444' }}>cargando…</p>}

      {!loading && albums.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: '14px' }}>
            álbumes · {albums.length}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', marginBottom: '8px' }}>
            {albums.map((a) => (
              <div key={a.album} style={{ cursor: 'default' }}>
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: '4px', marginBottom: '8px', overflow: 'hidden' }}>
                  <AlbumCover title={a.album} style={{ width: '100%', height: '100%' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.album}</div>
                <div style={{ fontSize: '9px', color: '#555' }}>{a.release_year ?? ''}{a.release_year ? ' · ' : ''}{a.tracks.length} tema{a.tracks.length !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && tracks.length > 0 && (
        <div>
          <div style={{ fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: '14px' }}>
            canciones · {tracks.length}
          </div>
          <TrackList tracks={tracks} />
        </div>
      )}
    </div>
  );
}

// ─── Canciones tab ────────────────────────────────────────────────────────────

function SongsTab() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient().from('tracks').select('*')
      .order('artist', { ascending: true, nullsFirst: false })
      .order('title', { ascending: true })
      .then(({ data }) => { setTracks(data ?? []); setLoading(false); });
  }, []);

  if (loading) return <p style={{ fontSize: '11px', color: '#444' }}>cargando…</p>;
  if (!tracks.length) return <p style={{ fontSize: '12px', color: '#444', fontStyle: 'italic', fontFamily: 'var(--font-instrument-serif), serif' }}>no hay canciones todavía</p>;
  return <TrackList tracks={tracks} />;
}

// ─── Albums tab ───────────────────────────────────────────────────────────────

interface AlbumRow { album: string; artist: string | null; release_year: number | null; source: Source; track_count: number }

function AlbumsTab({ onDrill }: { onDrill: (album: string, artist: string | null) => void }) {
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [loose, setLoose] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient().from('tracks').select('album, artist, release_year, source').then(({ data }) => {
      if (!data) { setLoading(false); return; }
      const map = new Map<string, AlbumRow>();
      let looseCount = 0;
      for (const row of data) {
        if (!row.album) { looseCount++; continue; }
        const key = `${row.album}::${row.artist}`;
        if (!map.has(key)) map.set(key, { album: row.album, artist: row.artist, release_year: row.release_year, source: row.source, track_count: 0 });
        map.get(key)!.track_count++;
      }
      setAlbums(Array.from(map.values()));
      setLoose(looseCount);
      setLoading(false);
    });
  }, []);

  if (loading) return <p style={{ fontSize: '11px', color: '#444' }}>cargando…</p>;
  if (!albums.length && !loose) return <p style={{ fontSize: '12px', color: '#444', fontStyle: 'italic', fontFamily: 'var(--font-instrument-serif), serif' }}>no hay álbumes todavía</p>;

  return (
    <div className="albums-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
      {albums.map((a) => (
        <div
          key={`${a.album}-${a.artist}`}
          onClick={() => onDrill(a.album, a.artist)}
          style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
        >
          <div style={{ width: '100%', aspectRatio: '1', borderRadius: '4px', marginBottom: '10px', position: 'relative', overflow: 'hidden' }}>
            <AlbumCover title={a.album} style={{ width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', bottom: '8px', right: '8px' }}><SourceBadge source={a.source} /></div>
          </div>
          <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.album}</div>
          <div style={{ fontSize: '10px', color: '#555' }}>{a.artist ?? '—'}{a.release_year ? ` · ${a.release_year}` : ''} · {a.track_count} tema{a.track_count !== 1 ? 's' : ''}</div>
        </div>
      ))}
      {loose > 0 && (
        <div style={{ opacity: 0.5, cursor: 'default' }}>
          <div style={{ width: '100%', aspectRatio: '1', background: 'linear-gradient(135deg, #1a1a1f, #1f1f28)', borderRadius: '4px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: '11px', color: '#444' }}>{loose} sin álbum</span>
          </div>
          <div style={{ fontSize: '11px', color: '#555' }}>canciones sueltas</div>
        </div>
      )}
    </div>
  );
}

// ─── Artists tab ──────────────────────────────────────────────────────────────

interface ArtistRow { name: string; count: number }

function ArtistsTab({ onDrill }: { onDrill: (name: string) => void }) {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient().from('tracks').select('artist').not('artist', 'is', null).then(({ data }) => {
      if (!data) { setLoading(false); return; }
      const map = new Map<string, number>();
      for (const row of data) { if (row.artist) map.set(row.artist, (map.get(row.artist) ?? 0) + 1); }
      setArtists(
        Array.from(map.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setLoading(false);
    });
  }, []);

  if (loading) return <p style={{ fontSize: '11px', color: '#444' }}>cargando…</p>;
  if (!artists.length) return <p style={{ fontSize: '12px', color: '#444', fontStyle: 'italic', fontFamily: 'var(--font-instrument-serif), serif' }}>no hay artistas todavía</p>;

  return (
    <div>
      {artists.map((a) => (
        <div
          key={a.name}
          onClick={() => onDrill(a.name)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.1s ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
        >
          <span style={{ fontSize: '13px', color: '#bbb' }}>{a.name}</span>
          <span style={{ fontSize: '10px', color: '#444' }}>{a.count} canción{a.count !== 1 ? 'es' : ''}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Drill = null
  | { type: 'album'; album: string; artist: string | null; prevTab: LibTab }
  | { type: 'artist'; name: string; prevTab: LibTab }

export default function LibraryView() {
  const [tab, setTab] = useState<LibTab>('canciones');
  const [drill, setDrill] = useState<Drill>(null);

  const drillAlbum  = (album: string, artist: string | null) => setDrill({ type: 'album',  album, artist, prevTab: tab });
  const drillArtist = (name: string)                         => setDrill({ type: 'artist', name,         prevTab: tab });
  const back        = () => { if (drill) { setTab(drill.prevTab); setDrill(null); } };

  const tabBtn = (id: LibTab, label: string) => (
    <button
      key={id} onClick={() => setTab(id)}
      style={{ fontSize: '10px', padding: '5px 14px', borderRadius: '3px', border: `1px solid ${tab === id ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}`, background: tab === id ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === id ? '#e8e4df' : '#555', cursor: 'pointer', transition: 'all 0.15s ease' }}
    >
      {label}
    </button>
  );

  return (
    <div className="animate-slide-up view-pad" style={{ padding: '28px 32px' }}>
      {!drill && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {tabBtn('canciones', 'canciones')}
          {tabBtn('albumes',   'álbumes')}
          {tabBtn('artistas',  'artistas')}
        </div>
      )}

      {drill?.type === 'album'  && <AlbumDetail  album={drill.album} artist={drill.artist} onBack={back} />}
      {drill?.type === 'artist' && <ArtistDetail name={drill.name}                         onBack={back} />}

      {!drill && tab === 'canciones' && <SongsTab />}
      {!drill && tab === 'albumes'   && <AlbumsTab   onDrill={drillAlbum} />}
      {!drill && tab === 'artistas'  && <ArtistsTab  onDrill={drillArtist} />}
    </div>
  );
}
