'use client';

import { usePlayer } from './PlayerContext';
import SourceBadge from './SourceBadge';
import EqBars from './EqBars';
import { formatDuration } from '@/lib/utils';

interface Props { onClose: () => void }

export default function QueuePanel({ onClose }: Props) {
  const { queue, queueIndex, currentTrack, isPlaying, playTrack, removeFromQueue } = usePlayer();

  const upNext  = queue.slice(queueIndex + 1);
  const isEmpty = !currentTrack && upNext.length === 0;

  return (
    <div style={{
      position: 'fixed',
      right: 0, top: 0, bottom: '72px',
      width: '272px',
      background: '#111116',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>cola</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {isEmpty && (
          <p style={{ fontSize: '11px', color: '#333', textAlign: 'center', padding: '40px 20px', fontStyle: 'italic', fontFamily: 'var(--font-instrument-serif), serif' }}>
            la cola está vacía
          </p>
        )}

        {/* Now playing */}
        {currentTrack && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: '10px' }}>reproduciendo ahora</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '3px', background: 'linear-gradient(135deg, #1a1a20, #252530)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <EqBars playing={isPlaying} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', color: '#e8e4df', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.title}</div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>{currentTrack.artist ?? '—'}</div>
              </div>
              <SourceBadge source={currentTrack.source} />
            </div>
          </div>
        )}

        {/* Up next */}
        {upNext.length > 0 && (
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', padding: '14px 20px 8px' }}>
              a continuación · {upNext.length}
            </div>
            {upNext.map((track, i) => {
              const absIndex = queueIndex + 1 + i;
              return (
                <QueueRow
                  key={`${track.id}-${absIndex}`}
                  track={track}
                  position={i + 1}
                  onPlay={() => playTrack(track, queue, absIndex)}
                  onRemove={() => removeFromQueue(absIndex)}
                />
              );
            })}
          </div>
        )}

        {currentTrack && upNext.length === 0 && (
          <p style={{ fontSize: '10px', color: '#333', textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>
            fin de la cola
          </p>
        )}
      </div>
    </div>
  );
}

function QueueRow({ track, position, onPlay, onRemove }: { track: { title: string; artist?: string; duration?: number; source: import('@/lib/types').Source }; position: number; onPlay: () => void; onRemove: () => void }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 20px', cursor: 'pointer', transition: 'background 0.1s ease' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      onClick={onPlay}
    >
      <span style={{ fontSize: '9px', color: '#444', width: '16px', flexShrink: 0, textAlign: 'right' }}>{position}</span>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '11px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
        <div style={{ fontSize: '9px', color: '#555' }}>{track.artist ?? '—'}</div>
      </div>
      <span style={{ fontSize: '9px', color: '#444', flexShrink: 0 }}>{formatDuration(track.duration)}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '13px', lineHeight: 1, padding: '0 0 0 4px', flexShrink: 0, transition: 'color 0.1s ease' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#888'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#444'; }}
      >
        ×
      </button>
    </div>
  );
}
