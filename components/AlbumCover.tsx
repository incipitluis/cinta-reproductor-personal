'use client';

import { useId } from 'react';

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface Props {
  title: string;
  size?: number;
  style?: React.CSSProperties;
}

export default function AlbumCover({ title, size = 200, style }: Props) {
  const uid = 'ac' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const vb = 200;
  const cx = 100;
  const cy = 100;
  const src = title || '?';
  const baseHue = hash(src) % 360;

  // Fog blobs (approach A): 3 radial gradient circles derived from first 3 chars
  const blobs = [0, 1, 2].map((i) => {
    const code = src.charCodeAt(Math.min(i, src.length - 1));
    const bx = 30 + ((code * (53 + i * 17)) % 140);
    const by = 30 + ((code * (71 + i * 13)) % 140);
    const r  = 42 + (code % 30);
    const hue = (baseHue + i * 108) % 360;
    return { id: `${uid}${i}`, bx, by, r, hue };
  });

  // Radial arcs from center (approach C): one per char, up to 14
  const rayStr = src.slice(0, 14);
  const rays = Array.from(rayStr).map((char, i) => {
    const code  = char.charCodeAt(0);
    const angle = (code / 128) * Math.PI * 2;
    const len   = 18 + (i / rayStr.length) * 74;
    const hue   = (baseHue + 140 + i * 22) % 360;
    const opacity = 0.10 + (code % 22) / 120;
    const sw    = 0.7 + (i % 3) * 0.35;
    const perp  = angle + Math.PI / 2;
    const off   = len * 0.14;
    const ex    = cx + Math.cos(angle) * len;
    const ey    = cy + Math.sin(angle) * len;
    const qx    = (cx + ex) / 2 + Math.cos(perp) * off;
    const qy    = (cy + ey) / 2 + Math.sin(perp) * off;
    return { ex, ey, qx, qy, hue, opacity, sw };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      style={{ display: 'block', ...style }}
    >
      <rect width={vb} height={vb} fill="#1a1a20" />
      <defs>
        {blobs.map(({ id, bx, by, r, hue }) => (
          <radialGradient key={id} id={id} cx={bx} cy={by} r={r} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={`hsl(${hue},24%,21%)`} stopOpacity="0.9" />
            <stop offset="100%" stopColor={`hsl(${hue},14%,12%)`} stopOpacity="0"   />
          </radialGradient>
        ))}
      </defs>
      {blobs.map(({ id, bx, by, r }) => (
        <circle key={id} cx={bx} cy={by} r={r} fill={`url(#${id})`} />
      ))}
      {rays.map(({ ex, ey, qx, qy, hue, opacity, sw }, i) => (
        <path
          key={i}
          d={`M ${cx} ${cy} Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`}
          stroke={`hsl(${hue},38%,58%)`}
          strokeWidth={sw}
          fill="none"
          opacity={opacity}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
