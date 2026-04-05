/** Animated equalizer bars — shown next to the currently playing track */
export default function EqBars({ playing }: { playing: boolean }) {
  const base: React.CSSProperties = {
    width: '2px',
    background: '#b8c4a0',
    borderRadius: '1px',
    alignSelf: 'flex-end',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
      <div
        style={{
          ...base,
          height: playing ? '90%' : '35%',
          animation: playing ? 'eq1 0.8s ease infinite' : 'none',
        }}
      />
      <div
        style={{
          ...base,
          height: playing ? '35%' : '65%',
          animation: playing ? 'eq2 0.6s ease infinite' : 'none',
        }}
      />
      <div
        style={{
          ...base,
          height: playing ? '70%' : '80%',
          animation: playing ? 'eq3 0.7s ease infinite' : 'none',
        }}
      />
    </div>
  );
}
