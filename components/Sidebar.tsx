'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Playlist } from '@/lib/types';
import type { View } from '@/components/main-panel';

interface Props {
  view: View;
  activePl: string | null;
  onNav: (view: View) => void;
  onPlaylist: (id: string) => void;
  onPlaylistDeleted: (id: string) => void;
}

const NAV: { id: View; label: string }[] = [
  { id: 'home',    label: 'inicio' },
  { id: 'library', label: 'biblioteca' },
  { id: 'search',  label: 'buscar' },
  { id: 'upload',  label: 'subir' },
];

const SOURCES = [
  { label: 'archivos locales',    color: '#b8c4a0' },
  { label: 'soundcloud',          color: '#f0a56c' },
  { label: 'free music archive',  color: '#8fa8c8' },
];

export default function Sidebar({ view, activePl, onNav, onPlaylist, onPlaylistDeleted }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [hoverId, setHoverId]     = useState<string | null>(null);
  const [renaming, setRenaming]   = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    createClient()
      .from('playlists')
      .select('id, name, cover, created_at')
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setPlaylists(data); });
  }, []);

  useEffect(() => {
    if (renaming && renameRef.current) renameRef.current.focus();
  }, [renaming]);

  const createPlaylist = async () => {
    const { data } = await createClient()
      .from('playlists')
      .insert({ name: 'nueva lista', cover: '♪' })
      .select()
      .single();
    if (data) {
      setPlaylists((prev) => [...prev, data]);
      onPlaylist(data.id);
      onNav('playlist');
      setRenaming(data.id);
      setRenameVal('nueva lista');
    }
  };

  const saveRename = async (id: string) => {
    const name = renameVal.trim() || 'nueva lista';
    setPlaylists((prev) => prev.map((p) => p.id === id ? { ...p, name } : p));
    setRenaming(null);
    await createClient().from('playlists').update({ name }).eq('id', id);
  };

  const deletePlaylist = async (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    onPlaylistDeleted(id);
    await createClient().from('playlists').delete().eq('id', id);
  };

  const navBtnStyle = (active: boolean): React.CSSProperties => ({
    display: 'block', width: '100%', textAlign: 'left',
    background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
    border: 'none',
    color: active ? '#e8e4df' : '#666',
    fontSize: '12px', padding: '8px 10px', borderRadius: '4px',
    cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.15s ease',
  });

  return (
    <aside style={{ width: '220px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
      {/* App name */}
      <div style={{ padding: '0 20px', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: '26px', fontWeight: 400, color: '#e8e4df', letterSpacing: '-0.02em', lineHeight: 1 }}>
          cinta
        </h1>
        <div style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555', marginTop: '4px' }}>
          reproductor personal
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '0 12px', marginBottom: '28px' }}>
        {NAV.map((item) => (
          <button key={item.id} onClick={() => onNav(item.id)} style={navBtnStyle(view === item.id)}>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Playlist list */}
      <div style={{ padding: '0 12px', flex: 1, overflow: 'auto' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#444' }}>listas</span>
          <button
            onClick={createPlaylist}
            title="nueva lista"
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', transition: 'color 0.15s ease' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#e8e4df'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
          >
            +
          </button>
        </div>

        {playlists.length === 0 && (
          <p style={{ fontSize: '10px', color: '#444', padding: '6px 10px', fontStyle: 'italic' }}>sin listas</p>
        )}

        {playlists.map((pl) => {
          const active = activePl === pl.id && view === 'playlist';

          if (renaming === pl.id) {
            return (
              <div key={pl.id} style={{ padding: '4px 10px' }}>
                <input
                  ref={renameRef}
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename(pl.id);
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  onBlur={() => saveRename(pl.id)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '3px', padding: '5px 8px', color: '#e8e4df', fontSize: '11px', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            );
          }

          return (
            <div
              key={pl.id}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoverId(pl.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <button
                onClick={() => { onPlaylist(pl.id); onNav('playlist'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', textAlign: 'left',
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: 'none',
                  color: active ? '#e8e4df' : '#666',
                  fontSize: '11px', padding: '7px 10px', borderRadius: '4px',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  paddingRight: hoverId === pl.id ? '52px' : '10px',
                }}
              >
                <span style={{ fontSize: '14px', width: '20px', textAlign: 'center', flexShrink: 0 }}>
                  {pl.cover ?? '▸'}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {pl.name}
                </span>
              </button>

              {hoverId === pl.id && (
                <div
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '2px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { setRenaming(pl.id); setRenameVal(pl.name); }}
                    title="renombrar"
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '11px', padding: '2px 4px', lineHeight: 1, transition: 'color 0.1s ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#aaa'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deletePlaylist(pl.id)}
                    title="eliminar"
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', lineHeight: 1, transition: 'color 0.1s ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#c48080'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sources legend */}
      <div style={{ padding: '16px 22px', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 'auto' }}>
        <div style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#444', marginBottom: '8px' }}>fuentes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {SOURCES.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: '9px', color: '#666' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
