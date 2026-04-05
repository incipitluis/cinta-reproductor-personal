import type { Source } from '@/lib/types';

const CONFIG: Record<Source, { label: string; color: string }> = {
  local:      { label: 'local', color: '#b8c4a0' },
  soundcloud: { label: 'sc',    color: '#f0a56c' },
  fma:        { label: 'fma',   color: '#8fa8c8' },
};

export default function SourceBadge({ source }: { source: Source }) {
  const { label, color } = CONFIG[source];
  return (
    <span
      style={{
        fontSize: '9px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color,
        border: `1px solid ${color}40`,
        borderRadius: '2px',
        padding: '1px 5px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}
