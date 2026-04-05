'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import SourceBadge from '@/components/SourceBadge';
import type { Source } from '@/lib/types';

interface AlbumRow {
  album: string;
  artist: string | null;
  release_year: number | null;
  source: Source;
  track_count: number;
}

export default function LibraryView() {
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('tracks')
      .select('album, artist, release_year, source')
      .not('album', 'is', null)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        // Group by album + artist
        const map = new Map<string, AlbumRow>();
        for (const row of data) {
          const key = `${row.album}::${row.artist}`;
          if (!map.has(key)) {
            map.set(key, {
              album: row.album,
              artist: row.artist,
              release_year: row.release_year,
              source: row.source,
              track_count: 0,
            });
          }
          map.get(key)!.track_count++;
        }

        setAlbums(Array.from(map.values()));
        setLoading(false);
      });
  }, []);

  return (
    <div className="animate-slide-up" style={{ padding: '28px 32px' }}>
      <h2
        style={{
          fontFamily: 'var(--font-instrument-serif), serif',
          fontSize: '36px',
          fontWeight: 400,
          color: '#e8e4df',
          letterSpacing: '-0.02em',
          marginBottom: '28px',
        }}
      >
        biblioteca
      </h2>

      {loading && <p style={{ fontSize: '11px', color: '#444' }}>cargando…</p>}

      {!loading && albums.length === 0 && (
        <p
          style={{
            fontSize: '12px',
            color: '#444',
            fontStyle: 'italic',
            fontFamily: 'var(--font-instrument-serif), serif',
          }}
        >
          sube archivos o añade tracks para ver álbumes aquí
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '20px',
        }}
      >
        {albums.map((a) => (
          <AlbumCard key={`${a.album}-${a.artist}`} album={a} />
        ))}
      </div>
    </div>
  );
}

function AlbumCard({ album }: { album: AlbumRow }) {
  return (
    <div
      style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
    >
      {/* Cover placeholder */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          background: 'linear-gradient(135deg, #1a1a20, #252530)',
          borderRadius: '4px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '32px',
            color: 'rgba(255,255,255,0.08)',
            fontStyle: 'italic',
            userSelect: 'none',
          }}
        >
          {album.album.charAt(0)}
        </span>
        <div style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
          <SourceBadge source={album.source} />
        </div>
      </div>

      <div
        style={{
          fontSize: '12px',
          color: '#ccc',
          marginBottom: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {album.album}
      </div>
      <div style={{ fontSize: '10px', color: '#555' }}>
        {album.artist ?? '—'}
        {album.release_year ? ` · ${album.release_year}` : ''}
      </div>
    </div>
  );
}
