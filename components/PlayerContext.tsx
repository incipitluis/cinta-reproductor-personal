'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Track } from '@/lib/types';
import { getLocalTrackUrl } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// ─── SC Widget types ────────────────────────────────────────────────────────

interface SCWidget {
  play(): void;
  pause(): void;
  seekTo(ms: number): void;
  setVolume(vol: number): void;
  load(url: string, options: Record<string, unknown>): void;
  bind(event: string, listener: (data?: Record<string, number>) => void): void;
  getDuration(cb: (ms: number) => void): void;
}

declare global {
  interface Window {
    SC?: {
      Widget: ((iframe: HTMLIFrameElement) => SCWidget) & {
        Events: Record<string, string>;
      };
    };
  }
}

// ─── Context shape ───────────────────────────────────────────────────────────

interface PlayerContextType {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: Track, queue?: Track[], index?: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
}

const PlayerContext = createContext<PlayerContextType>({
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 80,
  playTrack: () => {},
  togglePlay: () => {},
  next: () => {},
  prev: () => {},
  seekTo: () => {},
  setVolume: () => {},
  addToQueue: () => {},
  removeFromQueue: () => {},
  reorderQueue: () => {},
});

export function usePlayer() {
  return useContext(PlayerContext);
}

// ─── SC script loader ────────────────────────────────────────────────────────

let scScriptPromise: Promise<void> | null = null;

function loadSCScript(): Promise<void> {
  if (scScriptPromise) return scScriptPromise;
  scScriptPromise = new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.SC) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return scScriptPromise;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scIframeRef = useRef<HTMLIFrameElement | null>(null);
  const scWidgetRef = useRef<SCWidget | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);

  // Wire up HTML5 audio events once on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate  = () => setCurrentTime(audio.currentTime);
    const onDuration    = () => setDuration(audio.duration || 0);
    const onEnded       = () => goNext();
    const onPlay        = () => setIsPlaying(true);
    const onPause       = () => setIsPlaying(false);

    audio.addEventListener('timeupdate',      onTimeUpdate);
    audio.addEventListener('durationchange',  onDuration);
    audio.addEventListener('loadedmetadata',  onDuration);
    audio.addEventListener('ended',           onEnded);
    audio.addEventListener('play',            onPlay);
    audio.addEventListener('pause',           onPause);

    return () => {
      audio.removeEventListener('timeupdate',      onTimeUpdate);
      audio.removeEventListener('durationchange',  onDuration);
      audio.removeEventListener('loadedmetadata',  onDuration);
      audio.removeEventListener('ended',           onEnded);
      audio.removeEventListener('play',            onPlay);
      audio.removeEventListener('pause',           onPause);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigation helpers ───────────────────────────────────────────────────

  const goNext = useCallback(() => {
    setQueue((q) => {
      setQueueIndex((i) => {
        const next = i + 1;
        if (next < q.length) {
          setPendingPlay(next);
          return next;
        }
        return i;
      });
      return q;
    });
  }, []);

  // When queueIndex changes, play the corresponding track
  const queueRef = useRef<Track[]>([]);
  queueRef.current = queue;

  const [pendingPlay, setPendingPlay] = useState<number | null>(null);

  useEffect(() => {
    if (pendingPlay === null) return;
    const track = queueRef.current[pendingPlay];
    if (track) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      startTrack(track);
    }
    setPendingPlay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPlay]);

  // ── Audio adapters ───────────────────────────────────────────────────────

  const pauseSC = useCallback(() => {
    if (scWidgetRef.current) {
      try { scWidgetRef.current.pause(); } catch {}
    }
  }, []);

  const pauseAudio = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const playAudioTrack = useCallback(async (track: Track) => {
    pauseSC();
    const audio = audioRef.current;
    if (!audio) return;

    const url =
      track.source === 'local'
        ? getLocalTrackUrl(track.source_ref)
        : track.source_ref; // fma: direct MP3 URL

    audio.src = url;
    audio.volume = volume / 100;
    setCurrentTime(0);
    setDuration(track.duration ?? 0);

    try {
      await audio.play();
    } catch {
      // Autoplay blocked — user must interact
    }
  }, [pauseSC, volume]);

  const playSCTrack = useCallback(async (track: Track) => {
    pauseAudio();
    setCurrentTime(0);
    setDuration(track.duration ?? 0);

    const iframe = scIframeRef.current;
    if (!iframe) return;

    await loadSCScript();

    const embedUrl =
      `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.source_ref)}` +
      `&auto_play=false&show_artwork=false&buying=false&sharing=false&show_user=false`;

    iframe.src = embedUrl;

    const handleLoad = () => {
      if (!window.SC || !iframe) return;
      const widget = window.SC.Widget(iframe);
      scWidgetRef.current = widget;

      widget.bind(window.SC.Widget.Events.READY, () => {
        widget.setVolume(volume);
        widget.play();
      });

      widget.bind(window.SC.Widget.Events.PLAY, () => setIsPlaying(true));
      widget.bind(window.SC.Widget.Events.PAUSE, () => setIsPlaying(false));

      widget.bind(window.SC.Widget.Events.PLAY_PROGRESS, (data) => {
        if (data) {
          setCurrentTime(data.currentPosition / 1000);
          if (!duration) {
            widget.getDuration((ms) => setDuration(ms / 1000));
          }
        }
      });

      widget.bind(window.SC.Widget.Events.FINISH, () => goNext());
    };

    iframe.addEventListener('load', handleLoad, { once: true });
  }, [pauseAudio, volume, duration, goNext]);

  // ── Main play function ───────────────────────────────────────────────────

  const startTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    createClient()
      .from('tracks')
      .update({ last_played_at: new Date().toISOString() })
      .eq('id', track.id)
      .then(() => {});
    if (track.source === 'soundcloud') {
      playSCTrack(track);
    } else {
      playAudioTrack(track);
    }
  }, [playSCTrack, playAudioTrack]);

  const playTrack = useCallback((
    track: Track,
    newQueue?: Track[],
    index?: number,
  ) => {
    if (newQueue) {
      setQueue(newQueue);
      setQueueIndex(index ?? 0);
    }
    startTrack(track);
  }, [startTrack]);

  // ── Controls ─────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;

    if (currentTrack.source === 'soundcloud') {
      if (isPlaying) {
        scWidgetRef.current?.pause();
      } else {
        scWidgetRef.current?.play();
      }
    } else {
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
    }
  }, [currentTrack, isPlaying]);

  const next = useCallback(() => {
    if (queueIndex + 1 < queue.length) {
      const nextIndex = queueIndex + 1;
      setQueueIndex(nextIndex);
      startTrack(queue[nextIndex]);
    }
  }, [queue, queueIndex, startTrack]);

  const prev = useCallback(() => {
    // If more than 3 seconds in, restart; otherwise go to previous
    if (currentTime > 3 && currentTrack) {
      seekTo(0);
      return;
    }
    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      setQueueIndex(prevIndex);
      startTrack(queue[prevIndex]);
    }
  }, [currentTime, currentTrack, queue, queueIndex, startTrack]); // eslint-disable-line

  const seekTo = useCallback((seconds: number) => {
    if (!currentTrack) return;
    if (currentTrack.source === 'soundcloud') {
      scWidgetRef.current?.seekTo(seconds * 1000);
      setCurrentTime(seconds);
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = seconds;
        setCurrentTime(seconds);
      }
    }
  }, [currentTrack]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => { const next = [...prev]; next.splice(index, 1); return next; });
    setQueueIndex((i) => index < i ? i - 1 : i);
  }, []);

  const reorderQueue = useCallback((from: number, to: number) => {
    setQueue((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setQueueIndex((i) => {
      if (i === from) return to;
      if (from < i && to >= i) return i - 1;
      if (from > i && to <= i) return i + 1;
      return i;
    });
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
    }
    if (scWidgetRef.current) {
      try { scWidgetRef.current.setVolume(vol); } catch {}
    }
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        queueIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        playTrack,
        togglePlay,
        next,
        prev,
        seekTo,
        setVolume,
        addToQueue,
        removeFromQueue,
        reorderQueue,
      }}
    >
      {children}

      {/* Hidden HTML5 audio element */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="metadata" style={{ display: 'none' }} />

      {/* Hidden SoundCloud iframe */}
      <iframe
        ref={scIframeRef}
        src="about:blank"
        title="SoundCloud Player"
        allow="autoplay"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          border: 'none',
          overflow: 'hidden',
        }}
      />
    </PlayerContext.Provider>
  );
}
