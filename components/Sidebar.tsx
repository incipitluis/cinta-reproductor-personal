'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Playlist } from '@/lib/types';
import type { View } from '@/components/main-panel';

interface Props {
  view: View;
  activePl: string | null;
  onNav: (view: View) => void;
  onPlaylist: (id: string) => void;
}

const NAV: { id: View; label: string }[] = [
  { id: 'home',    label: 'inicio' },
  { id: 'library', label: 'biblioteca' },
  { id: 'search',  label: 'buscar' },
  { id: 'upload',  label: 'subir' },
];

const SOURCES = [
  { label: 'archivos locales', color: '#b8c4a0' },
  { label: 'soundcloud',       color: '#f0a56c' },
  { label: 'free music archive', color: '#8fa8c8' },
];

export default function Sidebar({ view, activePl, onNav, onPlaylist }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('playlists')
      .select('id, name, cover, created_at')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setPlaylists(data);
      });
  }, []);

  return (
    <aside
      style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
      }}
    >
      {/* App name */}
      <div style={{ padding: '0 20px', marginBottom: '32px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '26px',
            fontWeight: 400,
            color: '#e8e4df',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          cinta
        </h1>
        <div
          style={{
            fontSize: '8px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#555',
            marginTop: '4px',
          }}
        >
          reproductor personal
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '0 12px', marginBottom: '28px' }}>
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: view === item.id ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: 'none',
              color: view === item.id ? '#e8e4df' : '#666',
              fontSize: '12px',
              padding: '8px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'all 0.15s ease',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Playlist list */}
      <div
        style={{
          padding: '0 12px',
          flex: 1,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            fontSize: '8px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#444',
            padding: '0 10px',
            marginBottom: '8px',
          }}
        >
          listas
        </div>

        {playlists.length === 0 && (
          <p
            style={{
              fontSize: '10px',
              color: '#444',
              padding: '6px 10px',
              fontStyle: 'italic',
            }}
          >
            sin listas
          </p>
        )}

        {playlists.map((pl) => {
          const active = activePl === pl.id && view === 'playlist';
          return (
            <button
              key={pl.id}
              onClick={() => {
                onPlaylist(pl.id);
                onNav('playlist');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                textAlign: 'left',
                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: 'none',
                color: active ? '#e8e4df' : '#666',
                fontSize: '11px',
                padding: '7px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '14px', width: '20px', textAlign: 'center', flexShrink: 0 }}>
                {pl.cover ?? '▸'}
              </span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {pl.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sources legend */}
      <div
        style={{
          padding: '16px 22px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          marginTop: 'auto',
        }}
      >
        <div
          style={{
            fontSize: '8px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#444',
            marginBottom: '8px',
          }}
        >
          fuentes
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {SOURCES.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '1px',
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '9px', color: '#666' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
