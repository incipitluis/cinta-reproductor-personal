'use client';

import { useState } from 'react';
import { usePlayer } from './PlayerContext';
import AlbumCover from './AlbumCover';
import SourceBadge from './SourceBadge';
import EqBars from './EqBars';
import { formatDuration } from '@/lib/utils';
import type { Source } from '@/lib/types';

interface Props { onClose: () => void }

export default function QueuePanel({ onClose }: Props) {
  const { queue, queueIndex, currentTrack, isPlaying, playTrack, removeFromQueue, reorderQueue } = usePlayer();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const upNext  = queue.slice(queueIndex + 1);
  const isEmpty = !currentTrack && upNext.length === 0;

  const handleDrop = (toUpNextIdx: number) => {
    if (dragIdx !== null && dragIdx !== toUpNextIdx) {
      reorderQueue(queueIndex + 1 + dragIdx, queueIndex + 1 + toUpNextIdx);
    }
    setDragIdx(null);
    setDropIdx(null);
  };

  return (
    <div className="queue-panel" style={{
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
              <div style={{ width: '36px', height: '36px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                <AlbumCover title={currentTrack.title} style={{ width: '100%', height: '100%' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EqBars playing={isPlaying} />
                </div>
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
                  isDragging={dragIdx === i}
                  isDropTarget={dropIdx === i}
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => { e.preventDefault(); setDropIdx(i); }}
                  onDragLeave={() => setDropIdx(null)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
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

function QueueRow({
  track, position, onPlay, onRemove,
  isDragging, isDropTarget,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}: {
  track: { title: string; artist?: string; duration?: number; source: Source };
  position: number;
  onPlay: () => void;
  onRemove: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '7px 20px',
        cursor: 'grab',
        transition: 'background 0.1s ease',
        borderTop: isDropTarget ? '2px solid rgba(184,196,160,0.35)' : '2px solid transparent',
        opacity: isDragging ? 0.4 : 1,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      onClick={onPlay}
    >
      <span style={{ fontSize: '9px', color: '#333', width: '8px', flexShrink: 0, textAlign: 'center' }}>⠿</span>
      <span style={{ fontSize: '9px', color: '#444', width: '14px', flexShrink: 0, textAlign: 'right' }}>{position}</span>
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
