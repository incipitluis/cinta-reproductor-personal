'use client';

import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Local upload ────────────────────────────────────────────────────────────

const ACCEPTED = ['audio/mpeg', 'audio/flac', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/x-aac', 'audio/mp4'];
const ACCEPTED_EXT = '.mp3,.flac,.ogg,.wav,.aac';

interface UploadItem {
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      resolve(isFinite(audio.duration) ? audio.duration : 0);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => { resolve(0); URL.revokeObjectURL(url); };
    audio.src = url;
  });
}

function parseFilename(name: string): { title: string; artist?: string } {
  const base = name.replace(/\.[^.]+$/, '');
  const parts = base.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { title: base };
}

// ─── SoundCloud add ──────────────────────────────────────────────────────────

interface ScMeta {
  title: string;
  artist: string;
  cover_url: string | null;
}

interface ScLogItem {
  url: string;
  title: string;
  status: 'done' | 'error';
  error?: string;
}

function ScTab() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'preview' | 'saving' | 'done' | 'error'>('idle');
  const [meta, setMeta] = useState<ScMeta | null>(null);
  const [error, setError] = useState('');
  const [log, setLog] = useState<ScLogItem[]>([]);

  const fetchMeta = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus('loading');
    setError('');
    setMeta(null);

    try {
      const res = await fetch(`/api/soundcloud/oembed?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error desconocido');
        setStatus('error');
        return;
      }
      setMeta(data as ScMeta);
      setStatus('preview');
    } catch {
      setError('No se pudo conectar con el servidor');
      setStatus('error');
    }
  }, [url]);

  const save = useCallback(async () => {
    if (!meta) return;
    setStatus('saving');
    const supabase = createClient();

    const { error: dbError } = await supabase.from('tracks').insert({
      title: meta.title,
      artist: meta.artist || null,
      cover_url: meta.cover_url || null,
      source: 'soundcloud',
      source_ref: url.trim(),
    });

    if (dbError) {
      setError(dbError.message);
      setStatus('error');
      setLog((prev) => [{ url: url.trim(), title: meta.title, status: 'error', error: dbError.message }, ...prev]);
      return;
    }

    setLog((prev) => [{ url: url.trim(), title: meta.title, status: 'done' }, ...prev]);
    setUrl('');
    setMeta(null);
    setStatus('idle');
  }, [meta, url]);

  const reset = () => {
    setUrl('');
    setMeta(null);
    setStatus('idle');
    setError('');
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '4px',
    padding: '10px 14px',
    color: '#e8e4df',
    fontSize: '12px',
    width: '100%',
    outline: 'none',
  };

  return (
    <div>
      <p style={{ fontSize: '11px', color: '#555', marginBottom: '24px' }}>
        pega una URL de SoundCloud para añadir la pista a tu biblioteca
      </p>

      {/* URL input row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (status !== 'idle') reset(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchMeta(); }}
          placeholder="https://soundcloud.com/artista/pista"
          style={{ ...inputStyle, flex: 1 }}
          disabled={status === 'loading' || status === 'saving'}
        />
        <button
          onClick={fetchMeta}
          disabled={!url.trim() || status === 'loading' || status === 'saving'}
          style={{
            padding: '10px 18px',
            borderRadius: '3px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#aaa',
            fontSize: '11px',
            cursor: 'pointer',
            flexShrink: 0,
            opacity: !url.trim() || status === 'loading' ? 0.4 : 1,
          }}
        >
          {status === 'loading' ? 'buscando…' : 'buscar'}
        </button>
      </div>

      {/* Error */}
      {status === 'error' && (
        <p style={{ fontSize: '11px', color: '#c48080', marginBottom: '16px' }}>{error}</p>
      )}

      {/* Metadata preview */}
      {(status === 'preview' || status === 'saving') && meta && (
        <div
          style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            padding: '16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '6px',
            marginBottom: '16px',
          }}
        >
          {meta.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.cover_url}
              alt=""
              style={{ width: '52px', height: '52px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '13px',
                color: '#e8e4df',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: '4px',
              }}
            >
              {meta.title}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>{meta.artist}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={reset}
              style={{
                padding: '7px 14px',
                borderRadius: '3px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: '#555',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              cancelar
            </button>
            <button
              onClick={save}
              disabled={status === 'saving'}
              style={{
                padding: '7px 14px',
                borderRadius: '3px',
                border: '1px solid rgba(184,196,160,0.3)',
                background: 'rgba(184,196,160,0.08)',
                color: '#b8c4a0',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              {status === 'saving' ? 'guardando…' : 'guardar en biblioteca'}
            </button>
          </div>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#444',
              marginBottom: '10px',
            }}
          >
            añadidas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {log.map((item, idx) => (
              <div
                key={idx}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: item.status === 'done' ? '#b8c4a0' : '#c48080',
                  }}
                />
                <span
                  style={{
                    color: item.status === 'done' ? '#888' : '#c48080',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {item.title}
                </span>
                <span style={{ color: '#444', flexShrink: 0 }}>
                  {item.status === 'done' ? 'listo' : (item.error ?? 'error')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

type Tab = 'archivo' | 'soundcloud';

export default function UploadView() {
  const [tab, setTab] = useState<Tab>('archivo');
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: File[]) => {
    const audio = files.filter((f) => ACCEPTED.includes(f.type) || f.name.match(/\.(mp3|flac|ogg|wav|aac)$/i));
    if (!audio.length) return;

    const supabase = createClient();

    const initItems: UploadItem[] = audio.map((f) => ({ name: f.name, status: 'pending' }));
    setItems((prev) => [...initItems, ...prev]);

    for (const file of audio) {
      setItems((prev) =>
        prev.map((i) => (i.name === file.name ? { ...i, status: 'uploading' } : i)),
      );

      try {
        const [duration, meta] = await Promise.all([
          readDuration(file),
          Promise.resolve(parseFilename(file.name)),
        ]);

        const ext = file.name.split('.').pop() ?? 'mp3';
        const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const { error: storageError } = await supabase.storage
          .from('music')
          .upload(path, file, { contentType: file.type || `audio/${ext}` });

        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from('tracks').insert({
          title: meta.title,
          artist: meta.artist ?? null,
          duration: duration || null,
          source: 'local',
          source_ref: path,
        });

        if (dbError) throw dbError;

        setItems((prev) =>
          prev.map((i) => (i.name === file.name ? { ...i, status: 'done' } : i)),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setItems((prev) =>
          prev.map((i) =>
            i.name === file.name ? { ...i, status: 'error', error: msg } : i,
          ),
        );
      }
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      uploadFiles(Array.from(e.dataTransfer.files));
    },
    [uploadFiles],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        uploadFiles(Array.from(e.target.files));
        e.target.value = '';
      }
    },
    [uploadFiles],
  );

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        fontSize: '10px',
        padding: '5px 14px',
        borderRadius: '3px',
        border: `1px solid ${tab === id ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}`,
        background: tab === id ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: tab === id ? '#e8e4df' : '#555',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="animate-slide-up" style={{ padding: '28px 32px' }}>
      <h2
        style={{
          fontFamily: 'var(--font-instrument-serif), serif',
          fontSize: '36px',
          fontWeight: 400,
          color: '#e8e4df',
          letterSpacing: '-0.02em',
          marginBottom: '20px',
        }}
      >
        añadir
      </h2>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
        {tabBtn('archivo', 'archivo local')}
        {tabBtn('soundcloud', 'soundcloud')}
      </div>

      {/* ── Archivo tab ── */}
      {tab === 'archivo' && (
        <>
          <p style={{ fontSize: '11px', color: '#555', marginBottom: '20px' }}>
            sube archivos a tu biblioteca personal en supabase storage
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `1px dashed ${dragging ? '#b8c4a0' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '6px',
              padding: '60px 40px',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              background: dragging ? 'rgba(184,196,160,0.04)' : 'transparent',
              cursor: 'pointer',
              color: dragging ? '#b8c4a0' : '#888',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <UploadIcon />
            </div>
            <div style={{ fontSize: '12px', marginBottom: '6px' }}>arrastra archivos aquí</div>
            <div style={{ fontSize: '10px', color: '#444' }}>mp3 · flac · ogg · wav · aac</div>
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              style={{
                marginTop: '20px',
                fontSize: '10px',
                padding: '8px 20px',
                borderRadius: '3px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: '#aaa',
                cursor: 'pointer',
              }}
            >
              o selecciona archivos
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXT}
            onChange={onFileChange}
            style={{ display: 'none' }}
          />

          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#555',
                marginBottom: '8px',
              }}
            >
              metadatos
            </div>
            <div style={{ fontSize: '11px', color: '#666', lineHeight: 1.6 }}>
              se intenta extraer título y artista del nombre del archivo (formato{' '}
              <span style={{ color: '#888' }}>Artista - Título.mp3</span>).
            </div>
          </div>

          {items.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div
                style={{
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#444',
                  marginBottom: '10px',
                }}
              >
                archivos
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        background:
                          item.status === 'done'      ? '#b8c4a0' :
                          item.status === 'error'     ? '#c48080' :
                          item.status === 'uploading' ? '#f0a56c' : '#444',
                      }}
                    />
                    <span
                      style={{
                        color: item.status === 'done' ? '#888' : item.status === 'error' ? '#c48080' : '#aaa',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {item.name}
                    </span>
                    <span style={{ color: '#444', flexShrink: 0 }}>
                      {item.status === 'uploading' ? 'subiendo…' :
                       item.status === 'done'      ? 'listo' :
                       item.status === 'error'     ? (item.error ?? 'error') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SoundCloud tab ── */}
      {tab === 'soundcloud' && <ScTab />}
    </div>
  );
}
