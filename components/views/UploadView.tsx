'use client';

import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const ACCEPTED = ['audio/mpeg', 'audio/flac', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/x-aac', 'audio/mp4'];
const ACCEPTED_EXT = '.mp3,.flac,.ogg,.wav,.aac';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => { resolve(isFinite(audio.duration) ? audio.duration : 0); URL.revokeObjectURL(url); };
    audio.onerror = () => { resolve(0); URL.revokeObjectURL(url); };
    audio.src = url;
  });
}

function parseFilename(name: string): { title: string; artist: string } {
  const base = name.replace(/\.[^.]+$/, '');
  const parts = base.split(' - ');
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  return { title: base, artist: '' };
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}

// ─── Local upload tab ────────────────────────────────────────────────────────

interface StagedFile {
  id: string;
  file: File;
  title: string;
  artist: string;
  album: string;
  year: string;
  duration: number;
  status: 'staged' | 'uploading' | 'done' | 'error';
  error?: string;
}

const fieldInput: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  color: '#e8e4df',
  fontSize: '11px',
  padding: '2px 4px',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
};

function LocalTab() {
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const stageFiles = useCallback(async (files: File[]) => {
    const audio = files.filter((f) => ACCEPTED.includes(f.type) || f.name.match(/\.(mp3|flac|ogg|wav|aac)$/i));
    if (!audio.length) return;

    const newStaged: StagedFile[] = await Promise.all(
      audio.map(async (file) => {
        const [duration, meta] = await Promise.all([readDuration(file), Promise.resolve(parseFilename(file.name))]);
        return { id: crypto.randomUUID(), file, title: meta.title, artist: meta.artist, album: '', year: '', duration, status: 'staged' as const };
      }),
    );
    setStaged((prev) => [...prev, ...newStaged]);
  }, []);

  const updateField = (id: string, field: keyof Pick<StagedFile, 'title' | 'artist' | 'album' | 'year'>, value: string) => {
    setStaged((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const remove = (id: string) => setStaged((prev) => prev.filter((s) => s.id !== id));

  const uploadAll = useCallback(async () => {
    const pending = staged.filter((s) => s.status === 'staged');
    if (!pending.length) return;
    setUploading(true);
    const supabase = createClient();

    for (const item of pending) {
      setStaged((prev) => prev.map((s) => s.id === item.id ? { ...s, status: 'uploading' } : s));
      try {
        const ext = item.file.name.split('.').pop() ?? 'mp3';
        const path = `${Date.now()}-${item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const { error: storageError } = await supabase.storage
          .from('music')
          .upload(path, item.file, { contentType: item.file.type || `audio/${ext}` });
        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from('tracks').insert({
          title: item.title || item.file.name,
          artist: item.artist || null,
          album: item.album || null,
          release_year: item.year ? parseInt(item.year) || null : null,
          duration: item.duration || null,
          source: 'local',
          source_ref: path,
        });
        if (dbError) throw dbError;

        setStaged((prev) => prev.map((s) => s.id === item.id ? { ...s, status: 'done' } : s));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStaged((prev) => prev.map((s) => s.id === item.id ? { ...s, status: 'error', error: msg } : s));
      }
    }
    setUploading(false);
  }, [staged]);

  const reset = () => setStaged([]);

  const hasPending = staged.some((s) => s.status === 'staged');
  const allDone    = staged.length > 0 && staged.every((s) => s.status === 'done' || s.status === 'error');

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    stageFiles(Array.from(e.dataTransfer.files));
  }, [stageFiles]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { stageFiles(Array.from(e.target.files)); e.target.value = ''; }
  }, [stageFiles]);

  return (
    <div>
      <p style={{ fontSize: '11px', color: '#555', marginBottom: '20px' }}>
        sube archivos a tu biblioteca personal en supabase storage
      </p>

      {/* Drop zone — compact when files are staged */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1px dashed ${dragging ? '#b8c4a0' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: '6px',
          padding: staged.length ? '16px 24px' : '60px 40px',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          background: dragging ? 'rgba(184,196,160,0.04)' : 'transparent',
          cursor: 'pointer',
          color: dragging ? '#b8c4a0' : '#888',
          marginBottom: staged.length ? '20px' : '0',
        }}
      >
        {staged.length ? (
          <div style={{ fontSize: '11px', color: '#555' }}>+ arrastra más archivos o haz clic para añadir</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><UploadIcon /></div>
            <div style={{ fontSize: '12px', marginBottom: '6px' }}>arrastra archivos aquí</div>
            <div style={{ fontSize: '10px', color: '#444' }}>mp3 · flac · ogg · wav · aac</div>
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              style={{ marginTop: '20px', fontSize: '10px', padding: '8px 20px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#aaa', cursor: 'pointer' }}
            >
              o selecciona archivos
            </button>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" multiple accept={ACCEPTED_EXT} onChange={onFileChange} style={{ display: 'none' }} />

      {/* Staging table */}
      {staged.length > 0 && (
        <div>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 64px 28px', gap: '8px', padding: '0 8px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
            {['título', 'artista', 'álbum', 'año', ''].map((h, i) => (
              <span key={i} style={{ fontSize: '8px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>

          {staged.map((item) => {
            const locked = item.status !== 'staged';
            const statusColor = item.status === 'done' ? '#b8c4a0' : item.status === 'error' ? '#c48080' : item.status === 'uploading' ? '#f0a56c' : '#444';

            return (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 64px 28px', gap: '8px', padding: '8px', alignItems: 'center', borderRadius: '4px', marginBottom: '2px', background: locked ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                <input
                  value={item.title} disabled={locked} placeholder="título"
                  onChange={(e) => updateField(item.id, 'title', e.target.value)}
                  style={{ ...fieldInput, opacity: locked ? 0.5 : 1 }}
                />
                <input
                  value={item.artist} disabled={locked} placeholder="artista"
                  onChange={(e) => updateField(item.id, 'artist', e.target.value)}
                  style={{ ...fieldInput, opacity: locked ? 0.5 : 1 }}
                />
                <input
                  value={item.album} disabled={locked} placeholder="álbum"
                  onChange={(e) => updateField(item.id, 'album', e.target.value)}
                  style={{ ...fieldInput, opacity: locked ? 0.5 : 1 }}
                />
                <input
                  value={item.year} disabled={locked} placeholder="año" maxLength={4}
                  onChange={(e) => updateField(item.id, 'year', e.target.value.replace(/\D/g, ''))}
                  style={{ ...fieldInput, opacity: locked ? 0.5 : 1 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.status === 'staged' ? (
                    <button onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px', padding: '0', lineHeight: 1 }} title="eliminar">×</button>
                  ) : (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, display: 'block', margin: '0 auto' }} title={item.error} />
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            {allDone && (
              <button onClick={reset} style={{ fontSize: '10px', padding: '8px 16px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#555', cursor: 'pointer' }}>
                limpiar
              </button>
            )}
            {hasPending && (
              <button
                onClick={uploadAll}
                disabled={uploading}
                style={{ fontSize: '10px', padding: '8px 20px', borderRadius: '3px', border: '1px solid rgba(184,196,160,0.3)', background: 'rgba(184,196,160,0.08)', color: '#b8c4a0', cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}
              >
                {uploading ? 'subiendo…' : `subir ${staged.filter((s) => s.status === 'staged').length} archivo${staged.filter((s) => s.status === 'staged').length !== 1 ? 's' : ''} →`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SoundCloud tab ──────────────────────────────────────────────────────────

interface ScMeta { title: string; artist: string; cover_url: string | null }
interface ScForm { title: string; artist: string; album: string; year: string }
interface ScLogItem { url: string; title: string; status: 'done' | 'error'; error?: string }

function ScTab() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'preview' | 'saving' | 'done' | 'error'>('idle');
  const [meta, setMeta] = useState<ScMeta | null>(null);
  const [form, setForm] = useState<ScForm>({ title: '', artist: '', album: '', year: '' });
  const [error, setError] = useState('');
  const [log, setLog] = useState<ScLogItem[]>([]);

  const fetchMeta = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus('loading'); setError(''); setMeta(null);
    try {
      const res = await fetch(`/api/soundcloud/oembed?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error desconocido'); setStatus('error'); return; }
      setMeta(data as ScMeta);
      setForm({ title: data.title ?? '', artist: data.artist ?? '', album: '', year: '' });
      setStatus('preview');
    } catch {
      setError('No se pudo conectar con el servidor'); setStatus('error');
    }
  }, [url]);

  const save = useCallback(async () => {
    if (!meta) return;
    setStatus('saving');
    const supabase = createClient();
    const { error: dbError } = await supabase.from('tracks').insert({
      title: form.title || meta.title,
      artist: form.artist || null,
      album: form.album || null,
      release_year: form.year ? parseInt(form.year) || null : null,
      cover_url: meta.cover_url || null,
      source: 'soundcloud',
      source_ref: url.trim(),
    });
    if (dbError) {
      setError(dbError.message); setStatus('error');
      setLog((prev) => [{ url: url.trim(), title: form.title, status: 'error', error: dbError.message }, ...prev]);
      return;
    }
    setLog((prev) => [{ url: url.trim(), title: form.title, status: 'done' }, ...prev]);
    setUrl(''); setMeta(null); setForm({ title: '', artist: '', album: '', year: '' }); setStatus('idle');
  }, [meta, form, url]);

  const reset = () => { setUrl(''); setMeta(null); setForm({ title: '', artist: '', album: '', year: '' }); setStatus('idle'); setError(''); };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '4px', padding: '10px 14px', color: '#e8e4df',
    fontSize: '12px', width: '100%', outline: 'none',
  };

  return (
    <div>
      <p style={{ fontSize: '11px', color: '#555', marginBottom: '24px' }}>
        pega una URL de SoundCloud para añadir la pista a tu biblioteca
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="url" value={url} placeholder="https://soundcloud.com/artista/pista"
          onChange={(e) => { setUrl(e.target.value); if (status !== 'idle') reset(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchMeta(); }}
          style={{ ...inputStyle, flex: 1 }}
          disabled={status === 'loading' || status === 'saving'}
        />
        <button
          onClick={fetchMeta} disabled={!url.trim() || status === 'loading' || status === 'saving'}
          style={{ padding: '10px 18px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#aaa', fontSize: '11px', cursor: 'pointer', flexShrink: 0, opacity: !url.trim() || status === 'loading' ? 0.4 : 1 }}
        >
          {status === 'loading' ? 'buscando…' : 'buscar'}
        </button>
      </div>

      {status === 'error' && <p style={{ fontSize: '11px', color: '#c48080', marginBottom: '16px' }}>{error}</p>}

      {(status === 'preview' || status === 'saving') && meta && (
        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
            {meta.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meta.cover_url} alt="" style={{ width: '52px', height: '52px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, fontSize: '10px', color: '#555' }}>
              metadatos editables antes de guardar
            </div>
          </div>

          {/* Editable form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {([['título', 'title'], ['artista', 'artist'], ['álbum', 'album'], ['año', 'year']] as [string, keyof ScForm][]).map(([label, key]) => (
              <div key={key}>
                <div style={{ fontSize: '8px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  disabled={status === 'saving'}
                  maxLength={key === 'year' ? 4 : undefined}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '3px', padding: '6px 10px', color: '#e8e4df', fontSize: '11px', width: '100%', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={reset} style={{ padding: '7px 14px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#555', fontSize: '10px', cursor: 'pointer' }}>cancelar</button>
            <button onClick={save} disabled={status === 'saving'} style={{ padding: '7px 14px', borderRadius: '3px', border: '1px solid rgba(184,196,160,0.3)', background: 'rgba(184,196,160,0.08)', color: '#b8c4a0', fontSize: '10px', cursor: 'pointer' }}>
              {status === 'saving' ? 'guardando…' : 'guardar en biblioteca'}
            </button>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: '10px' }}>añadidas</div>
          {log.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', marginBottom: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: item.status === 'done' ? '#b8c4a0' : '#c48080' }} />
              <span style={{ color: item.status === 'done' ? '#888' : '#c48080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.title}</span>
              <span style={{ color: '#444', flexShrink: 0 }}>{item.status === 'done' ? 'listo' : (item.error ?? 'error')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

type Tab = 'archivo' | 'soundcloud';

export default function UploadView() {
  const [tab, setTab] = useState<Tab>('archivo');

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id} onClick={() => setTab(id)}
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
    <div className="animate-slide-up view-pad" style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
        {tabBtn('archivo', 'archivo local')}
        {tabBtn('soundcloud', 'soundcloud')}
      </div>
      {tab === 'archivo'    && <LocalTab />}
      {tab === 'soundcloud' && <ScTab />}
    </div>
  );
}
