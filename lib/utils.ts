const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Get the public URL for a track stored in Supabase Storage */
export function getLocalTrackUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/music/${storagePath}`;
}

/** Format seconds as M:SS */
export function formatDuration(seconds?: number | null): string {
  if (!seconds || isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Format progress 0-1 as M:SS */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
