'use client';

import { useCallback } from 'react';
import { usePlayer } from './PlayerContext';
import AlbumCover from './AlbumCover';
import SourceBadge from './SourceBadge';
import { formatTime, formatDuration } from '@/lib/utils';

// ─── Icons ───────────────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6,3 20,12 6,21" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="3" width="5" height="18" />
      <rect x="14" y="3" width="5" height="18" />
    </svg>
  );
}

function SkipIcon({ direction = 'next' }: { direction?: 'next' | 'prev' }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={direction === 'prev' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <polygon points="4,3 16,12 4,21" />
      <rect x="17" y="3" width="3" height="18" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="6,9 2,9 2,15 6,15 11,19 11,5" fill="currentColor" stroke="none" />
      <path d="M15 8.5c1 1 1 6 0 7" />
      <path d="M18 6c2.5 2.5 2.5 9.5 0 12" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="15" y2="18" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { showQueue: boolean; onToggleQueue: () => void }

export default function PlayerBar({ showQueue, onToggleQueue }: Props) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    next,
    prev,
    seekTo,
    setVolume,
  } = usePlayer();

  const progress = duration > 0 ? currentTime / duration : 0;

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const t = ((e.clientX - rect.left) / rect.width) * duration;
      seekTo(Math.max(0, Math.min(duration, t)));
    },
    [duration, seekTo],
  );

  const handleVolume = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const v = ((e.clientX - rect.left) / rect.width) * 100;
      setVolume(Math.max(0, Math.min(100, v)));
    },
    [setVolume],
  );

  return (
    <>
    {/* ── Mobile mini player ─────────────────────────────────────────────── */}
    <div
      className="player-bar-mini"
      style={{
        position: 'fixed',
        bottom: '56px',
        left: 0,
        right: 0,
        height: '52px',
        background: '#0f1014',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexDirection: 'column',
        zIndex: 39,
        flexShrink: 0,
      }}
    >
      {/* Progress line */}
      <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: '#b8c4a0', transition: 'width 0.1s linear' }} />
      </div>
      {/* Row */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
          {currentTrack ? (
            <AlbumCover title={currentTrack.title} style={{ width: '100%', height: '100%' }} />
          ) : (
            <div style={{ width: '34px', height: '34px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: currentTrack ? '#e8e4df' : '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack?.title ?? 'sin reproducción'}
          </div>
          {currentTrack && (
            <div style={{ fontSize: '10px', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.artist ?? '—'}
            </div>
          )}
        </div>
        <button onClick={prev} style={{ ...btnStyle, padding: '8px' }} aria-label="Anterior">
          <SkipIcon direction="prev" />
        </button>
        <button
          onClick={togglePlay}
          style={{ ...btnStyle, border: '1px solid rgba(255,255,255,0.18)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8e4df', padding: 0 }}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button onClick={next} style={{ ...btnStyle, padding: '8px' }} aria-label="Siguiente">
          <SkipIcon direction="next" />
        </button>
      </div>
    </div>

    {/* ── Desktop full player bar ────────────────────────────────────────── */}
    <div
      className="player-bar-full"
      style={{
        height: '72px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: '#0f1014',
        alignItems: 'center',
        padding: '0 20px',
        gap: '20px',
        flexShrink: 0,
      }}
    >
      {/* Track info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          width: '240px',
          flexShrink: 0,
        }}
      >
        {/* Cover */}
        <div style={{ width: '44px', height: '44px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
          {currentTrack ? (
            <AlbumCover title={currentTrack.title} style={{ width: '100%', height: '100%' }} />
          ) : (
            <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #1a1a22, #22222e)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.07)' }}>♫</span>
            </div>
          )}
        </div>

        {/* Title + artist */}
        <div style={{ minWidth: 0, flex: 1 }}>
          {currentTrack ? (
            <>
              <div
                style={{
                  fontSize: '12px',
                  color: '#e8e4df',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentTrack.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#555',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentTrack.artist ?? '—'}
                </span>
                <SourceBadge source={currentTrack.source} />
              </div>
            </>
          ) : (
            <span
              style={{
                fontSize: '11px',
                color: '#444',
                fontStyle: 'italic',
                fontFamily: 'var(--font-instrument-serif), serif',
              }}
            >
              sin reproducción
            </span>
          )}
        </div>
      </div>

      {/* Controls + progress */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={prev}
            style={btnStyle}
            aria-label="Anterior"
          >
            <SkipIcon direction="prev" />
          </button>

          <button
            onClick={togglePlay}
            style={{
              ...btnStyle,
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e8e4df',
              transition: 'border-color 0.15s ease',
            }}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button onClick={next} style={btnStyle} aria-label="Siguiente">
            <SkipIcon direction="next" />
          </button>
        </div>

        {/* Progress bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            maxWidth: '520px',
          }}
        >
          <span style={timeStyle}>{formatTime(currentTime)}</span>

          <div
            onClick={handleSeek}
            style={trackBarStyle}
            aria-label="Barra de progreso"
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: '#b8c4a0',
                borderRadius: '2px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>

          <span style={timeStyle}>{formatDuration(duration || currentTrack?.duration)}</span>
        </div>
      </div>

      {/* Volume + queue toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '130px', color: '#555' }}>
          <VolumeIcon />
          <div onClick={handleVolume} style={trackBarStyle} aria-label="Volumen">
            <div style={{ width: `${volume}%`, height: '100%', background: '#555', borderRadius: '2px' }} />
          </div>
        </div>

        <button
          onClick={onToggleQueue}
          title="cola de reproducción"
          style={{
            ...btnStyle,
            color: showQueue ? '#b8c4a0' : '#555',
            padding: '6px',
            borderRadius: '3px',
            background: showQueue ? 'rgba(184,196,160,0.08)' : 'transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <QueueIcon />
        </button>
      </div>
    </div>
    </>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#666',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const trackBarStyle: React.CSSProperties = {
  flex: 1,
  height: '3px',
  background: 'rgba(255,255,255,0.07)',
  borderRadius: '2px',
  cursor: 'pointer',
  position: 'relative',
};

const timeStyle: React.CSSProperties = {
  fontSize: '9px',
  color: '#444',
  fontVariantNumeric: 'tabular-nums',
  width: '32px',
  flexShrink: 0,
};
